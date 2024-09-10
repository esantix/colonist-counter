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
const RESOURCES_LIST = [LUMBER, BRICK, GRAIN, WOOL, ORE];
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

// ----------------------------   PARAMETERS ------------------------------------ //
let INCLUDE_SELF = false;

// ----------------------------  AUX VARIABLES ------------------------------------ //


let USER_COLORMAP = {};
let USERS_DATA = {}; // User resources map
let MY_USERNAME = "";

// States
let PREVIOUS_IS_MONOPOLY = false; // Aux variable for parsing monopoly log
let IS_OBSERVER_ACTIVE = false
let IS_DATA_ACTIVE = false;
let TURNS = 0;
let GAME_ENDED = false;

// Statistics
let DICE_STATS = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, max: 0 }
let USED_DEV_CARDS = { [KNIGHT]: 0, [MONOPOLY]: 0, [PLENTY]: 0, [ROAD2]: 0, [VP]: 0, "BOUGHT": 0}


// --------------------  INITIAL CORE ELEMENTS --------------------- //

const TOPBAR = document.createElement("div"); // Create top bar
TOPBAR.classList.add("top-bar");

const USER_DATA_WRAPPER = document.createElement("div"); // Div for data display
USER_DATA_WRAPPER.classList.add("user-div-wp")

TOPBAR.appendChild(USER_DATA_WRAPPER);
document.body.insertBefore(TOPBAR, document.body.firstChild);



// ------------------------   INIT  ---------------------------------- //

initOnLoad();


// --------------------------  FUNCTIONS  ---------------------------------- //


function reset(){
    USER_COLORMAP = {};
    USERS_DATA = {};
    MY_USERNAME = "";
    PREVIOUS_IS_MONOPOLY = false;
    IS_OBSERVER_ACTIVE = false
    IS_DATA_ACTIVE = false;
    TURNS = 0;
    GAME_ENDED = false;
    DICE_STATS = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, max: 0 }
    USED_DEV_CARDS = { [KNIGHT]: 0, [MONOPOLY]: 0, [PLENTY]: 0, [ROAD2]: 0, [VP]: 0, "BOUGHT": 0}
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

function initOnLoad() {
    // Detect load of logs wrapper for initialization 
    const LOG_LOADED_OBSERVER = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.id === LOG_WRAPPER_ID) {
                        console.clear()

                        activate()
                        //inspectCanvas()
                        LOG_LOADED_OBSERVER.disconnect();
                        break;
                    }
                }
            }
        }
    });

    LOG_LOADED_OBSERVER.observe(document.body, { childList: true, subtree: true });
}

function activate(){
    console.log("Activated")
    if (!IS_OBSERVER_ACTIVE) {

        MY_USERNAME = document.getElementById('header_profile_username').innerText;
        document.getElementById("in_game_ab_left").style.display = "none";
        document.getElementById("in_game_ab_right").style.display = "none";
        document.getElementById("in_game_ab_bottom").style.display = "none";
        document.getElementById("in_game_ab_bottom_small").style.display = "none";
        document.getElementById("remove_ad_in_game_right").style.display = "none";
        document.getElementById("remove_ad_in_game_left").style.display = "none";

        

        startLogObserver();
        console.log(`%c Colonist Resource counter is active`, 'background: #222; color: #bada55')
    }
}

function startLogObserver() {
    // Refresh data on changes on log element 
    const targetNode = document.getElementById(LOG_WRAPPER_ID);
    const LOG_OBSERVER = new MutationObserver(function (mutationsList, observer) {

        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    if (GAME_ENDED){
                        LOG_OBSERVER.disconnect()
                        IS_OBSERVER_ACTIVE = false;
                        reset();
                    }else{
                        if (!IS_DATA_ACTIVE) {
                            buildChart();
                            IS_DATA_ACTIVE = true;
                        }
                        let operations = parseLogMsg(node)
                        if (operations === false){
                            return 0
                        }
                        if (operations.length > 0) {
                            execute_ops(operations)
                        }
                    }
                })
    
            }
        }
    });

    LOG_OBSERVER.observe(targetNode, { attributes: true, childList: true, subtree: true });
    IS_OBSERVER_ACTIVE = true;
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
            if (user) {
                if (!(user in USERS_DATA)) { USERS_DATA[user] = { [ORE]: 0, [WOOL]: 0, [BRICK]: 0, [GRAIN]: 0, [LUMBER]: 0, [UNKNOWN_CARD]: 0 }; }
            }


            USERS_DATA[user][resource] += amount;
            if (flag == "MONOPOLY") {
                for (let player in USERS_DATA) {
                    if (player != user) { USERS_DATA[player][resource] = 0; }
                }
            }

        }
    }
    buildChart();
}

function addUserChart(user) {
    // A div per user
    let user_data = USERS_DATA[user];
    let userdiv = document.createElement("div");
    let user_hr = document.createElement("div");
    userdiv.classList.add("user-div")
    
    let id = "userdiv_" + user
    let hr_class  ="user-div-hr"
    let hdr = user

    if (user == MY_USERNAME){
        id = "userdiv_self"
        hdr = "(You)"

}

    userdiv.id = id

    user_hr.innerText = hdr;
    user_hr.classList.add(hr_class)

    let user_color = USER_COLORMAP[user];
    user_hr.style.color = user_color

    userdiv.appendChild(user_hr);
    for (let resource of RESOURCES_LIST) {

        let resource_div = document.createElement("div");
        resource_div.classList.add("resource-div")

        let r_img = document.createElement("img");
        r_img.classList.add("r_div_img")
        r_img.setAttribute("src", CARD_ICON[resource]);

        let r_span = document.createElement("span");
        r_span.classList.add("r_div_span")
        r_span.id = user + "_" + resource
        let n = user_data[resource];
        r_span.innerText = (n == 0) ? "" : `    ${n}`


        resource_div.appendChild(r_img);
        resource_div.appendChild(r_span);
        userdiv.appendChild(resource_div);

    }
    // Add updated chart
    USER_DATA_WRAPPER.append(userdiv);
}

function buildChart() {
    // Build graphical display of resources
    USER_DATA_WRAPPER.innerHTML = ""; // Needs to be cleared each time


    // CREATE USERS CHARTS
    Object.keys(USERS_DATA).forEach((user) => {

        if (user != MY_USERNAME || INCLUDE_SELF) {
            addUserChart(user)
        }

    });


    // CREATE STATS
    let stats_div = document.createElement("div");
    stats_div.classList.add("user-div")


    // DEV CARDS STATS
    let cards_hr = document.createElement("div");
    cards_hr.innerText = "Used cards";
    cards_hr.classList.add("user-div-hr")
    stats_div.appendChild(cards_hr);
    for (let card of DEV_LIST) {

        let dev_card_div = document.createElement("div");
        dev_card_div.classList.add("resource-div")

        let dev_img = document.createElement("img");
        dev_img.classList.add("r_div_img")
        dev_img.setAttribute("src", CARD_ICON[card]);

        let dev_span = document.createElement("span");
        dev_span.classList.add("r_div_span")
        dev_span.innerText = USED_DEV_CARDS[card];


        dev_card_div.appendChild(dev_img)
        dev_card_div.appendChild(dev_span)
        stats_div.appendChild(dev_card_div)
    }
    let avcards_hr = document.createElement("div");
    avcards_hr.innerText = "Available";
    avcards_hr.classList.add("user-div-hr")
    stats_div.appendChild(avcards_hr);

    let avdev_card_div = document.createElement("div");
    avdev_card_div.classList.add("resource-div")

    let avdev_img = document.createElement("img");
    avdev_img.classList.add("r_div_img")
    avdev_img.setAttribute("src", CARD_ICON[DEV_CARD]);

    let avdev_span = document.createElement("span");
    avdev_span.classList.add("r_div_span")
    avdev_span.innerText = 25 - USED_DEV_CARDS["BOUGHT"];

    avdev_card_div.appendChild(avdev_img)
    avdev_card_div.appendChild(avdev_span)
    stats_div.appendChild(avdev_card_div)

    // DICE STATS
    let dice_hr = document.createElement("div");
    dice_hr.innerText = "Dice stats";
    dice_hr.classList.add("user-div-hr")
    stats_div.appendChild(dice_hr);

    for (i = 2; i < 13; i++) {

        let number_div = document.createElement("div");
        number_div.classList.add("resource-div")

        let r_span = document.createElement("div");
        r_span.classList.add("d_div_span")
        r_span.style.width = "20px"
        r_span.innerText = `${i}`

        let bar = document.createElement("div");
        bar.classList.add("bar")
        bar.id = "dice_stat_bar_" + i

        bar.style.width = DICE_STATS[i] * 80 / DICE_STATS["max"] + "px"
        if (DICE_STATS[i] !== 0) {
            bar.innerText = DICE_STATS[i];
        }

        number_div.appendChild(r_span);
        number_div.appendChild(bar);
        stats_div.appendChild(number_div);

    }
    let number_div = document.createElement("div");
        number_div.classList.add("resource-div")

        let turns_span = document.createElement("div");
        turns_span.classList.add("d_div_span")
        turns_span.style.width = "100px"
        turns_span.innerText = `Turns: ${TURNS}`


        number_div.appendChild(turns_span);
        stats_div.appendChild(number_div);






    // Add updated chart
    USER_DATA_WRAPPER.append(stats_div);

}

function parseLogMsg(logHtmlElement) {
    // Parses html message into a list of operations
    // Return list of [user, amount_to_add, resource, flag]
    var operations = []; 
    try{

        let sec = logHtmlElement.classList[1]
        console.log(sec)
        if(sec == "victory-text"){
            console.log("GANASTE GUACHOOOO") 
            GAME_ENDED = true;  
            TURNS=0;
            return false
    }
    } 
    catch(e){}
    try {
        
        let msgCtn = logHtmlElement.childNodes[1].childNodes;
        var user = logHtmlElement.children[1].children[0].innerText.trim(); // no funciona para You Stole
        
       

        USER_COLORMAP[user] = logHtmlElement.children[1].children[0].style.color // Solo al existir log puedo scrappear color de usuario
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
                    if (item == "development card") {
                        operations.push([user, -1, WOOL, "PURCHASE_CARD"]);
                        operations.push([user, -1, GRAIN, "PURCHASE_CARD"]);
                        operations.push([user, -1, ORE, "PURCHASE_CARD"]);
                    }
                    USED_DEV_CARDS["BOUGHT"] += 1;
                    break;
                };

                case "built a": { // Build infra
                    let b_item = msgCtn[2].alt;
                    if (b_item == "road") {
                        operations.push([user, -1, LUMBER, "PURCHASE_ROAD"]);
                        operations.push([user, -1, BRICK, "PURCHASE_ROAD"]);
                    }
                    else if (b_item == "city") {
                        operations.push([user, -2, GRAIN, "PURCHASE_CITY"]);
                        operations.push([user, -3, ORE, "PURCHASE_CITY"]);
                    }
                    else if (b_item == "settlement") {
                        operations.push([user, -1, LUMBER, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, BRICK, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, WOOL, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, GRAIN, "PURCHASE_SETTLEMENT"]);
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


