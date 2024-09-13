// Author: santiago93echevarria@gmail.com
// Chrome Extension to help keep track of Colonist resource exchanges

// ----------------------------  CONSTANTS ------------------------------------ //

// Buildings
const ROAD = "road";
const SETTLEMENT = "settlement";
const CITY = "city";

// Resources
const LUMBER = "lumber";
const BRICK = "brick";
const GRAIN = "grain";
const WOOL = "wool";
const ORE = "ore";
const UNKNOWN_CARD = "card";

// Dev card log keyword
const MONOPOLY = "Monopoly";
const KNIGHT = "Knight";
const PLENTY = "Year of Plenty";
const ROAD2 = "Road Building";
const VP = "Vp";
const DEV_CARD = "development card";

// Game configuration variables
const RESOURCES_LIST = [LUMBER, BRICK, WOOL, GRAIN, ORE];
const DEV_LIST = [KNIGHT, MONOPOLY, PLENTY, ROAD2];

// Scrapping variables
const LOG_WRAPPER_ID = "game-log-text" // Class Id of log wrapper
const CARD_ICON = {
    [LUMBER]: "/dist/images/card_lumber.svg",
    [BRICK]: "/dist/images/card_brick.svg",
    [GRAIN]: "/dist/images/card_grain.svg",
    [WOOL]: "/dist/images/card_wool.svg",
    [ORE]: "/dist/images/card_ore.svg",
    [UNKNOWN_CARD]: "/dist/images/card_rescardback.svg",
    [DEV_CARD]: "/dist/images/card_devcardback.svg",
    [KNIGHT]: "/dist/images/card_knight.svg",
    [MONOPOLY]: "/dist/images/card_monopoly.svg",
    [PLENTY]: "/dist/images/card_yearofplenty.svg",
    [ROAD2]: "/dist/images/card_roadbuilding.svg",
    [VP]: "/dist/images/card_vp.svg"
};


const COLOR_CODE = {
    "rgb(226, 113, 116)":"red",
    "rgb(34, 54, 151)": "blue",
    "rgb(224, 151, 66)": "orange",
    "rgb(62, 62, 62)": "black",
    "rgb(98, 185, 93)" : "green"
}

// ----------------------------   PARAMETERS ------------------------------------ //
let SHOW_SELF = true;
let SHOW_INFRA = false;
let SHOW_STATS = true;

// ----------------------------  AUX VARIABLES ------------------------------------ //

let USER_COLORMAP = {};
let USER_ICON = {};
let USERS_DATA = {}; // User resources map
let MY_USERNAME = "";

// States
let PREVIOUS_IS_MONOPOLY = false;
let IS_OBSERVER_ACTIVE = false
let IS_DATA_ACTIVE = false;
let TURNS = 0;
let GAME_ENDED = false;

// Statistics
let DICE_STATS = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, max: 0 }
let USED_DEV_CARDS = { [KNIGHT]: 0, [MONOPOLY]: 0, [PLENTY]: 0, [ROAD2]: 0, [VP]: 0, "BOUGHT": 0 }
let MAX_DEV_CARDS = { [KNIGHT]: 14, [MONOPOLY]: 2, [PLENTY]: 2, [ROAD2]: 2, [VP]: 5 }
let MAX_INFRA = { [ROAD]: 15, [CITY]: 4, [SETTLEMENT]: 5}

// ------------------------   INITIALIZATION  ---------------------------------- //

initOnLoad();

// function enemyMsg(){
//     let msg = ""
//     Object.keys(USERS_DATA).forEach((user) => {

//         if (user != MY_USERNAME ){
//             msg += `You have ${"lumber".repeat(USERS_DATA[user]["lumber"])}  ${"brick".repeat(USERS_DATA[user]["brick"])}  ${"wool".repeat(USERS_DATA[user]["wool"])}  ${"grain".repeat(USERS_DATA[user]["grain"])}  ${"ore".repeat(USERS_DATA[user]["ore"])}  `
//         }
//     })
//     return msg
// }


// ------------------------   INITIALIZATION FUNCTIONS  ---------------------------------- //

function initOnLoad() {
    // Detect load of logs wrapper for initialization 
    const LOG_LOADED_OBSERVER = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.id === LOG_WRAPPER_ID) {
                        console.clear()
                        init()
                        LOG_LOADED_OBSERVER.disconnect();
                        break;
                    }
                }
            }
        }
    });

    LOG_LOADED_OBSERVER.observe(document.body, { childList: true, subtree: true });
}

function init() {

    if (!IS_OBSERVER_ACTIVE) {

        addInitialHtml()

        // TOPBAR.appendChild(STATS_DATA_WRAPPER);
        MY_USERNAME = document.getElementById('header_profile_username').innerText;
        document.getElementById("in_game_ab_left").style.display = "none";
        document.getElementById("in_game_ab_right").style.display = "none";
        document.getElementById("in_game_ab_bottom").style.display = "none";
        document.getElementById("in_game_ab_bottom_small").style.display = "none";
        document.getElementById("remove_ad_in_game_right").style.display = "none";
        document.getElementById("remove_ad_in_game_left").style.display = "none";

        startLogObserver();
        console.log(`%c Colonist Resource counter activated`, 'background: #222; color: #bada55')
        console.log("You are:" + MY_USERNAME)
        
        onWin()
    }
}

function startLogObserver() {
    // Refresh data on changes on log element 
    const targetNode = document.getElementById(LOG_WRAPPER_ID);
    const LOG_OBSERVER = new MutationObserver(function (mutationsList, observer) {

        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {

                    if (GAME_ENDED) {
                        LOG_OBSERVER.disconnect()
                        IS_OBSERVER_ACTIVE = false;
                        console.log(`%c Colonist Resource counter deactivated`, 'background: #222; color: #bada55')

                    }
                    else if (node.classList && node.classList[0] == "message-post") {

                        // If last message
                        if (node.classList[1] == "victory-text") {
                            GAME_ENDED = true;
                            return 0
                        }

                        let operations = parseLogMsg(node)
                        if (operations.length > 0) {
                            execute_ops(operations)
                            updateChart()
                        }

                    }
                })

            }
        }
    });

    LOG_OBSERVER.observe(targetNode, { attributes: true, childList: true, subtree: true });
    IS_OBSERVER_ACTIVE = true;
}


function onWin(){
   // document.getElementById("game-chat-input").value = enemyMsg()
}

// ------------------------  OPERATIONAL FUNCTIONS  ---------------------------------- //


function parseLogMsg(logHtmlElement) {
    // Parses html message into a list of operations
    // Return list of [user, amount_to_add, resource, flag]
    var operations = [];
    try {

        let msgCtn = logHtmlElement.childNodes[1].childNodes;
        var user = logHtmlElement.children[1].children[0].innerText.trim(); // no funciona para You Stole
        let color = logHtmlElement.children[1].children[0].style.color // Solo al existir log puedo scrappear color de usuario
        if (user) {
            if (!(user in USERS_DATA)) { USERS_DATA[user] = {
                                                             "color" : COLOR_CODE[color], 
                                                              [ORE]: 0, 
                                                              [WOOL]: 0, 
                                                              [BRICK]: 0, 
                                                              [GRAIN]: 0, 
                                                              [LUMBER]: 0, 
                                                              [ROAD]: 0, 
                                                              [CITY]: 0, 
                                                              [SETTLEMENT]: 0, 
                                                              [UNKNOWN_CARD]: 0 }; }
        }


        USER_COLORMAP[user] = color;

        
        USER_ICON[user]= logHtmlElement.children[0].src

        // Si el mensaje anterior es que suó monopoly
        if (PREVIOUS_IS_MONOPOLY) {
            let resource = msgCtn[2].alt;
            let amount = parseInt(msgCtn[1].textContent.replace("stole", "").trim());
            operations.push([user, amount, resource, "MONOPOLY"]);
            PREVIOUS_IS_MONOPOLY = false;
        }
        else if (logHtmlElement.innerText.trim().startsWith("You stole")) {
            let stolen = msgCtn[3].innerText;
            let resource = msgCtn[1].alt;
            operations.push([MY_USERNAME, +1, resource, "STOLE"]);
            operations.push([stolen, -1, resource, "GOT_STOLEN"]);

        } else {
            let action = msgCtn[1].textContent.trim(); // Accion
            // print(action)
            switch (action) {
                case "rolled": {
                    TURNS += 1;
                    let d1 = parseInt(msgCtn[2].alt.slice(-1));
                    let d2 = parseInt(msgCtn[4].alt.slice(-1));
                    operations.push([user, d1, d2, "DICE_DATA"]);
                    break;
                };

                case "received starting resources": {
                    TURNS += 2;
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, +1, resource, "STARTING"]);
                        }
                    }
                    break;
                };

                case "used": {// Uso de carta Monopoly. El siguiente mensaje muestra que se robó
                    let used_card = msgCtn[2].innerText.trim();
                    if (used_card == MONOPOLY) {
                        PREVIOUS_IS_MONOPOLY = true;
                    }
                    USED_DEV_CARDS[used_card] += 1;

                    break;
                };

                case "got": { // Entrega por dado o Year of Plenty (+2)
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, +1, resource, "RECIEVED_FROM_BANK"]);
                        }
                    }
                    break;
                }
                case "took from bank": {
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, +1, resource, "TOOK_FROM_BANK"]);
                        }
                    }
                    break;
                };

                case "discarded": {// Descarte por tener mas del limite en dado 7
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, -1, resource, "DISCARD"]);
                        }
                    }
                    break;
                };

                case "gave bank": {
                    let op = -1;
                    for (let i = 2; i < msgCtn.length; i++) {
                        if (msgCtn[i].textContent.trim() == "and took") {
                            op = +1;
                        }
                        else {
                            let resource = msgCtn[i].alt;
                            if (resource) {
                                operations.push([user, op, resource, "TRADE_BANK"]);
                            }
                        }
                    }
                    break;
                };

                case "gave": {// Player trade
                    let l = parseInt(msgCtn.length) - 1;
                    let user2 = msgCtn[l].innerText;

                    let taker = user;
                    let giver = user2;

                    for (let i = 2; i < msgCtn.length - 1; i++) {
                        if (msgCtn[i].nodeType == 3) {
                            taker = user2;
                            giver = user;
                        } else {
                            let resource = msgCtn[i].alt;

                            operations.push([taker, -1, resource, "TRADE_PLAYERS_GIVE"]);
                            operations.push([giver, +1, resource, "TRADE_PLAYERS_RECIEVE"]);
                        }
                    }
                    break;
                };

                case "bought": {// buy dev card
                    let item = msgCtn[2].alt;
                    if (item == DEV_CARD) {
                        operations.push([user, -1, WOOL, "PURCHASE_CARD"]);
                        operations.push([user, -1, GRAIN, "PURCHASE_CARD"]);
                        operations.push([user, -1, ORE, "PURCHASE_CARD"]);
                    }
                    USED_DEV_CARDS["BOUGHT"] += 1;
                    break;
                };

                case "built a": { // Build infra
                    let b_item = msgCtn[2].alt;
                    if (b_item == ROAD) {
                        USERS_DATA[user][ROAD] += 1
                        operations.push([user, -1, LUMBER, "PURCHASE_ROAD"]);
                        operations.push([user, -1, BRICK, "PURCHASE_ROAD"]);
                    }
                    else if (b_item == CITY) {
                        USERS_DATA[user][CITY] += 1
                        USERS_DATA[user][SETTLEMENT] -= 1
                        operations.push([user, -2, GRAIN, "PURCHASE_CITY"]);
                        operations.push([user, -3, ORE, "PURCHASE_CITY"]);
                    }
                    else if (b_item == SETTLEMENT) {
                        USERS_DATA[user][SETTLEMENT] += 1
                        operations.push([user, -1, LUMBER, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, BRICK, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, WOOL, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, GRAIN, "PURCHASE_SETTLEMENT"]);
                    }
                    break;
                };

                case "placed a": { // Initial free
                    let b_item = msgCtn[2].alt;
                    if (b_item == ROAD) {
                        USERS_DATA[user][ROAD] += 1
                    }
                    else if (b_item == SETTLEMENT) {
                        USERS_DATA[user][SETTLEMENT] += 1
                    }
                    break;
                };

                case "stole": {
                    let resource = msgCtn[2].alt;
                    if (msgCtn.length == 4) { // stole you o You stol
                        operations.push([user, +1, resource, "STOLE"]);
                        operations.push([MY_USERNAME, -1, resource, "GOT_STOLEN"]);
                    }
                    else {
                        let stoled = msgCtn[4].innerText;
                        operations.push([user, +1, resource, "STOLE"]);
                        operations.push([stoled, -1, resource, "STOLEN"]);
                    }
                    break;
                };
            }
        }

    } catch (e) {
    }

    return operations;
}

function execute_ops(operations) {
    for (let j = 0; j < operations.length; j++) {

        action = operations[j]
        log_action(action)

        let flag = action[3]
        if (flag == "DICE_DATA") {
            let d1 = action[1]
            let d2 = action[2]
            DICE_STATS[d1 + d2] += 1;
            DICE_STATS["max"] = Math.max(...Object.values(DICE_STATS))
        }
        else {
            //console.log(actions[j])


            let user = action[0]; // Who to modify resources to
            let amount = action[1]; // number of resource to add 
            let resource = action[2]; //


            USERS_DATA[user][resource] += amount;
            if (flag == "MONOPOLY") {
                for (let player in USERS_DATA) {
                    if (player != user) { USERS_DATA[player][resource] = 0; }
                }
            }

        }
    }
}

function log_action(action) {
    // Log actions with format
    let user = action[0];
    let amount = action[1];
    let resource = action[2];
    let flag = action[3];

    if (flag == "DICE_DATA") {
        console.log(`%c Turn ${TURNS}): ${user} rolled ${action[1] + action[2]}`, 'background: #222; color: #bada55')
    }
    else {
        let color = USER_COLORMAP[user]
        if (user == MY_USERNAME) {
            // color = "white"
        }
        console.log(`%c ${user}%c : ${(amount == 1) ? "+1" : amount} ${resource} (${flag})`, `color: ${color}; background: rgba(255, 255, 255, 0.6)`, '')
    }


}

// ------------------------  RENDERING FUNCTIONS ---------------------------------- //

function updateChart() {

    //document.getElementById("game-chat-input").value = enemyMsg()

    // Update Resources
    Object.keys(USERS_DATA).forEach((user) => {

        let user_div = document.getElementById("userdiv_" + user)
        if (!user_div) {
            addUserBlock(user)
        }
        if (user != MY_USERNAME || SHOW_SELF){

            for (let resource of RESOURCES_LIST) {
                let user_res_div = document.getElementById(user + "_" + resource)
                let n = USERS_DATA[user][resource];
                user_res_div.innerText = (n == 0) ? " " : n
            }

            if (SHOW_INFRA){
                document.getElementById(user + "_" + SETTLEMENT).innerText = MAX_INFRA[SETTLEMENT] - USERS_DATA[user][SETTLEMENT]
                if(USERS_DATA[user][SETTLEMENT] == MAX_INFRA[SETTLEMENT]){ color = "red"}else{ color = "black"}
                document.getElementById(user + "_" + SETTLEMENT).style.color = color;
                
                document.getElementById(user + "_road").innerText = MAX_INFRA[ROAD] -USERS_DATA[user][ROAD]
                if(USERS_DATA[user][ROAD] == MAX_INFRA[ROAD]){color = "red"}else{color = "black" }
                document.getElementById(user + "_road").style.color = color;
                
                
                document.getElementById(user + "_city").innerText = MAX_INFRA[CITY] - USERS_DATA[user][CITY]
                if(USERS_DATA[user][CITY] == MAX_INFRA[CITY]){ color = "red"}else{ color = "black"}
                document.getElementById(user + "_city").style.color = color;
            }
        }
            
    });

    if (SHOW_STATS){

        // Update cards
        document.getElementById("card_count_knight").innerText = `${USED_DEV_CARDS[KNIGHT]}/${MAX_DEV_CARDS[KNIGHT]}`;
        document.getElementById("card_count_monopoly").innerText = `${USED_DEV_CARDS[MONOPOLY]}/${MAX_DEV_CARDS[MONOPOLY]}`;
        document.getElementById("card_count_yearofplenty").innerText = `${USED_DEV_CARDS[PLENTY]}/${MAX_DEV_CARDS[PLENTY]}`;
        document.getElementById("card_count_roadbuilding").innerText = `${USED_DEV_CARDS[ROAD2]}/${MAX_DEV_CARDS[ROAD2]}`;
        document.getElementById("card_count_all").innerText = 25 - USED_DEV_CARDS["BOUGHT"];
        
            // Update dice stats
        for (i = 2; i < 13; i++) {
            let e = document.getElementById("dice_stat_bar_" + i)
            if (DICE_STATS[i] == 0){
                e.style.display = "none";
            }
            else{
                e.style.display = "block";
            }
            e.innerText =  (DICE_STATS[i] == 0) ? "" : `    ${DICE_STATS[i]}` ;
            e.style.width = DICE_STATS[i] * 80 / DICE_STATS["max"] + "px"
        }
    }
}

function addInitialHtml(){ 

    let htmlString = `<div class="main-extention-container">`
    htmlString += `
        <div class="config-wp">
            <button class="conf-button binactive" id="inf">BLDNGS</button>
            <button class="conf-button bactive" id="self">SELF</button>
            <button class="conf-button bactive" id="stats">STATS</button>
        </div>`

    htmlString += `
        <div class="data-wrapper user" id="user-data-wrapper">
        </div>
        <div class="data-wrapper stats" id="stats-data-wrapper">
            <div class="data-div stats-div">

                <div class="user-div-hr"> Game data</div>
                <div class="data-div-hr"> Played cards</div>
                <div class="d_div">
                    <img class="d_div_img" src="/dist/images/card_knight.svg" alt="">
                    <span id="card_count_knight" class="r_div_span">0/14</span>
                </div>
                <div class="d_div">
                    <img class="d_div_img" src="/dist/images/card_monopoly.svg" alt="">
                    <span id="card_count_monopoly" class="r_div_span">0/2</span>
                </div>
                <div class="d_div">
                    <img class="d_div_img" src="/dist/images/card_yearofplenty.svg" alt="">
                    <span id="card_count_yearofplenty" class="r_div_span">0/2</span>
                </div>
                <div class="d_div">
                    <img class="d_div_img" src="/dist/images/card_roadbuilding.svg" alt="">
                    <span id="card_count_roadbuilding" class="r_div_span">0/2</span>
                </div>
                
                <div class="data-div-hr"> Cards in bank</div>
                <div class="d_div">
                    <img class="d_div_img" src="/dist/images/card_devcardback.svg" alt="">
                    <span id="card_count_all" class="r_div_span">25</span>
                </div>
    
                <div class="data-div-hr"> Dice stats</div>
                <div class="d_div">
                    <span class="d_div_span">2</span>
                    <div class="d_bar" id="dice_stat_bar_2"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">3</span>
                    <div class="d_bar" id="dice_stat_bar_3"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">4</span>
                    <div class="d_bar" id="dice_stat_bar_4"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">5</span>
                    <div class="d_bar" id="dice_stat_bar_5"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">6</span>
                    <div class="d_bar" id="dice_stat_bar_6"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">7</span>
                    <div class="d_bar" id="dice_stat_bar_7"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">8</span>
                    <div class="d_bar" id="dice_stat_bar_8"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">9</span>
                    <div class="d_bar" id="dice_stat_bar_9"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">10</span>
                    <div class="d_bar" id="dice_stat_bar_10"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">11</span>
                    <div class="d_bar" id="dice_stat_bar_11"></div>
                </div>
            
                <div class="d_div">
                    <span class="d_div_span">12</span>
                    <div class="d_bar" id="dice_stat_bar_12"></div>
                </div>
            </div>
        </div>`

    htmlString += `</div>`
    document.body.insertAdjacentHTML('afterbegin', htmlString)

    const infBtncall = () => {
        SHOW_INFRA = SHOW_INFRA ? false : true
        let display = 'none'
        if (SHOW_INFRA){
            display = 'flex'
            document.getElementById("inf").classList.replace("binactive", "bactive")
        }else{

            document.getElementById("inf").classList.replace("bactive", "binactive")
        }
        document.querySelectorAll('.infra').forEach(element => {
            element.style.display = display;
        });
        updateChart() 
    };


    const selfBtncall = () => {
        SHOW_SELF = SHOW_SELF ? false : true
        let display = 'none'
        if (SHOW_SELF){
            document.getElementById("self").classList.replace("binactive", "bactive")
            display = 'block'
        }else{
            document.getElementById("self").classList.replace("bactive", "binactive")
        }
        document.getElementById(`userdiv_${MY_USERNAME}`).style.display = display;
        updateChart() 
    };

    const statsBtncall = () => {
        SHOW_STATS = SHOW_STATS ? false : true
        let display = 'none'
        if (SHOW_STATS){
            display = 'block'
            document.getElementById("stats").classList.replace("binactive", "bactive")
        }else{

            document.getElementById("stats").classList.replace("bactive", "binactive")
        }
        document.getElementById('stats-data-wrapper').style.display = display;
        updateChart() 
    };


    document.getElementById("inf").onclick = infBtncall
    document.getElementById("self").onclick = selfBtncall
    document.getElementById("stats").onclick = statsBtncall

}



function addUserBlock(user) {
    let color = USERS_DATA[user]["color"]
    let is_me = (MY_USERNAME == user) ? "me": ""
    document.getElementById("user-data-wrapper").innerHTML += `
        <div class="data-div user-div  ${is_me}" id="userdiv_${user}">

        
            <div class="user-div-title">
                <div class="user-div-hr" style="color:${USER_COLORMAP[user]};">${user}</div>
            </div>    
            
            
            <div class="r_div_wp infra">
                    <div class="r_div_build">
                        <img class="r_div_img_build" src="/dist/images/city_${color}.svg">
                        <span class="r_div_span_build" id="${user}_city"></span>
                    </div>
                        <div class="r_div_build">
                            <img class="r_div_img_build" src="/dist/images/settlement_${color}.svg">
                            <span class="r_div_span_build" id="${user}_settlement"></span>
                        </div>
                        
                        <div class="r_div_build">
                            <img class="r_div_img_build road" src="/dist/images/road_${color}.svg">
                            <span class="r_div_span_build" id="${user}_road"></span>
                        </div>
                 </div>
            <div class="r_div_wp">
          
                <div class="r_div">
                    <img class="r_div_img" src="/dist/images/card_lumber.svg">
                    <span class="r_div_span" id="${user}_lumber"> </span>
                </div>
                <div class="r_div">
                    <img class="r_div_img" src="/dist/images/card_brick.svg">
                    <span class="r_div_span" id="${user}_brick"></span>
                </div>
                <div class="r_div">
                    <img class="r_div_img" src="/dist/images/card_wool.svg">
                    <span class="r_div_span" id="${user}_wool"></span>
                </div>
                <div class="r_div">
                    <img class="r_div_img" src="/dist/images/card_grain.svg">
                    <span class="r_div_span" id="${user}_grain"></span>
                </div>
                <div class="r_div">
                    <img class="r_div_img" src="/dist/images/card_ore.svg">
                    <span class="r_div_span" id="${user}_ore"></span>
                </div>
            </div>
      
        
            
                </div>
                `

}



// -------------------------------------------------------------------------------- 