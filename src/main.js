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
const MONOPOLY = "monopoly";
const KNIGHT = "knight";
const PLENTY = "year of plenty";
const ROAD2 = "road building";
const VP = "vp";
const DEV_CARD = "development card";

// Game configuration variables
const RESOURCES_LIST = [LUMBER, BRICK, WOOL, GRAIN, ORE];
const DEV_LIST = [KNIGHT, MONOPOLY, PLENTY, ROAD2];

// Scrapping variables
const LOG_WRAPPER_CLASS = "gameFeedsContainer" // Class Id of log wrapper

const CARD_ICON = {
    [LUMBER]: "/dist/assets/card_lumber.cf22f8083cf89c2a29e7.svg",
    [BRICK]: "/dist/assets/card_brick.5950ea07a7ea01bc54a5.svg",
    [GRAIN]: "/dist/assets/card_grain.09c9d82146a64bce69b5.svg",
    [WOOL]: "/dist/assets/card_wool.17a6dea8d559949f0ccc.svg",
    [ORE]: "/dist/assets/card_ore.117f64dab28e1c987958.svg",
    [UNKNOWN_CARD]: "/dist/assets/card_devcardback.92569a1abd04a8c1c17e.svg",
    [DEV_CARD]: "/dist/assets/card_devcardback.92569a1abd04a8c1c17e.svg",
    [KNIGHT]: "/dist/assets/card_knight.a58573f2154fa93a6319.svg",
    [MONOPOLY]: "/dist/assets/card_monopoly.dfac189aaff62e271093.svg",
    [PLENTY]: "/dist/assets/card_yearofplenty.3df210b5455b7438db09.svg",
    [ROAD2]: "/dist/assets/card_roadbuilding.994e8f21698ce6c350bd.svg",
    [VP]: "/dist/assets/card_devcardback.92569a1abd04a8c1c17e.svg"
};

const ICONS_EXTRA = {
    [ROAD] : "/dist/assets/road_blue.3301e2eed15cae5a6a05.svg",
    [SETTLEMENT] : "/dist/assets/settlement_blue.bad4cdb43d65c329deda.svg",
    [CITY] : "/dist/assets/city_blue.43d846e83515f35f51f6.svg"
}

// reverse color mapping
const COLOR_CODE = {
    "rgb(226, 113, 116)": "red",
    "rgb(34, 54, 151)": "blue",
    "rgb(224, 151, 66)": "orange",
    "rgb(62, 62, 62)": "black",
    "rgb(98, 185, 93)": "green",
    "rgb(158, 158, 158)": "white"
}

// ----------------------------   PARAMETERS ------------------------------------ //
let SHOW_INFRA = true;
let SHOW_RES = true;
let SHOW_7 = true;
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
let CANVAS_MOVED = false;

// Statistics
let DICE_STATS = {
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    max: 0
}
let USED_DEV_CARDS = {
    [KNIGHT]: 0,
    [MONOPOLY]: 0,
    [PLENTY]: 0,
    [ROAD2]: 0,
    [VP]: 0,
    "BOUGHT": 0
}
let MAX_DEV_CARDS = {
    [KNIGHT]: 14,
    [MONOPOLY]: 2,
    [PLENTY]: 2,
    [ROAD2]: 2,
    [VP]: 5
}
let MAX_INFRA = {
    [ROAD]: 15,
    [CITY]: 4,
    [SETTLEMENT]: 5
}

let PROCSSED_LOGS = [

]

// ------------------------   INITIALIZATION  ---------------------------------- //

initOnLoad();

setInterval(() => {
    clearAds();
}, 4000);

// ------------------------   INITIALIZATION FUNCTIONS  ---------------------------------- //
//LOG_WRAPPER_CLASS
function initOnLoad() {
    // Detect load of logs wrapper for initialization 
    const LOG_LOADED_OBSERVER = new MutationObserver((mutationsList) => {

        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.id){
                        //console.log(node)
                        if (node.id == 'ui-game' ) {
                            //console.clear()
                            init()
                            LOG_LOADED_OBSERVER.disconnect();
                        }
                    }
                }
            }
        }
    });

    LOG_LOADED_OBSERVER.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function hideElementsByClassList(classList) {
    // Loop through the list of classes
    classList.forEach(className => {
        // Select all elements with the current class name
        const elements = document.querySelectorAll(`.${className}`);
        // Hide each element by setting its display to 'none'
        elements.forEach(element => {
            element.style.display = 'none';
        });
    });
}

function clearAds() {
    let ads_class_list = [
        "in_game_ab_left",
        "in_game_ab_right",
        "in_game_ab_bottom",
        "in_game_ab_bottom_small",
        "remove_ad_in_game_right",
        "remove_ad_in_game_left",
        "lobby_vertical_ab",
        "adsbyvli"
    ]
    hideElementsByClassList(ads_class_list)

}

function init() {
    //clearAds()
    if (!IS_OBSERVER_ACTIVE) {

        addInitialHtml()
        // TOPBAR.appendChild(STATS_DATA_WRAPPER);
        MY_USERNAME = "esantix";
        //clearAds()
        startLogObserver();
        //resume()

        console.log(`%c Colonist Resource counter activated`, 'background: #222; color: #bada55')
        console.log("You are:" + MY_USERNAME)

    }
}

function resume() {
    console.log("Resume started log")
    clearAds()
    const targetNode = document.querySelector('[class*="gameFeedsContainer"]');

    for (let node of targetNode.childNodes) {
        let operations = parseLogMsg(node)
        if (operations.length > 0) {
            execute_ops(operations)
        }
        updateChart()
    }
}

function startLogObserver() {
    //clearAds()
    // Refresh data on changes on log element 

    const LOG_OBSERVER = new MutationObserver(function(mutationsList, observer) {
        for (let mutation of mutationsList) {
            //console.log("Log mutation detected")
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    
                    
                    if (GAME_ENDED) {
                        LOG_OBSERVER.disconnect()
                        IS_OBSERVER_ACTIVE = false;
                        console.log(`%c Colonist Resource counter deactivated`, 'background: #222; color: #bada55')

                    } else if (node.classList && node.classList[0]) {
                        // If last message
                        if (node.classList[1] == "victory-text") {
                            GAME_ENDED = true;
                            return 0
                        }

                        let operations = parseLogMsg(node)
                        if (operations.length > 0) {
           
                            execute_ops(operations)
                        }
                        updateChart()

                    }
                })

            }
        }
    });

    let element = document.querySelector('[class*="gameFeedsContainer"]');
    const targetNode = element;
    console.log("Starting log observer on node: ", targetNode)
    LOG_OBSERVER.observe(targetNode, {
        attributes: true,
        childList: true,
        subtree: true
    });
    IS_OBSERVER_ACTIVE = true;
}


// ------------------------  OPERATIONAL FUNCTIONS  ---------------------------------- //


function bully() {
    //document.getElementById("game-chat-input").value = resourcesChatMsg()
    //document.getElementById("game-chat-form").submit();
}

function resourcesChatMsg() {
    let msg = ""
    Object.keys(USERS_DATA).forEach((user) => {

        if (user != MY_USERNAME) {

            let el = document.getElementById(`dataholder_${user}`)
            if (el.classList.contains("visible")) {
                msg += `${user} has ${"lumber ".repeat(USERS_DATA[user]["lumber"])}  ${"brick ".repeat(USERS_DATA[user]["brick"])}  ${"wool ".repeat(USERS_DATA[user]["wool"])}  ${"grain ".repeat(USERS_DATA[user]["grain"])}  ${"ore ".repeat(USERS_DATA[user]["ore"])}| `
                // msg += `${user} has ${USERS_DATA[user]["lumber"]} lumber ${USERS_DATA[user]["brick"]} brick ${USERS_DATA[user]["wool"]} wool ${USERS_DATA[user]["grain"]} grain  ${USERS_DATA[user]["ore"]} ore | `
            }
        }
    })
    return msg
}

function addUser(user, msgCtn) {
    let color = msgCtn.children[0].style.color // Solo al existir log puedo scrappear color de usuario
            USER_COLORMAP[user] = color;
            if (user) {
                if (!(user in USERS_DATA)) {
                    USERS_DATA[user] = {
                        "color": COLOR_CODE[color],
                        "7": 0,
                        [ORE]: 0,
                        [WOOL]: 0,
                        [BRICK]: 0,
                        [GRAIN]: 0,
                        [LUMBER]: 0,
                        [ROAD]: 0,
                        [CITY]: 0,
                        [SETTLEMENT]: 0,
                        [UNKNOWN_CARD]: 0
                    };
                }
            }
}

function parseLogMsg(logHtmlElement) {

    // Operations
    var operations = [];


    // Clear ads regularly
    clearAds()

    // Avoid duplicate mesage processing
    let dataindex = logHtmlElement.getAttribute("data-index")
    if (PROCSSED_LOGS.includes(dataindex)) {
        return operations
    } else {
        PROCSSED_LOGS.push(dataindex)
    }

    // Parses html message into a list of operations
    // Return list of [user, amount_to_add, resource, flag]
    
    try {
        if (!logHtmlElement.children[0].children[1]) {
            return operations;
        }
    }
    catch (e) {
        return operations;
    }


    
    try {
        let msgCtn = logHtmlElement.children[0].children[1]

        try {
            var user = msgCtn.children[0].innerText.trim(); // no funciona para You Stole
        }
        catch (e) {     
            return operations;
        }

    
        addUser(user, msgCtn);
        

        msgCtn = msgCtn.childNodes;
        // console.log(msgCtn)

        if (!msgCtn) {
            return operations;
        } 

        //USER_ICON[user] = logHtmlElement.children[0].src

        // Si el mensaje anterior es que suó monopoly
        if (PREVIOUS_IS_MONOPOLY) {
            let resource = msgCtn[2].alt;
            let amount = parseInt(msgCtn[1].textContent.replace("stole", "").trim());
            operations.push([user, amount, resource, "MONOPOLY"]);
            PREVIOUS_IS_MONOPOLY = false;
        } else if (logHtmlElement.innerText.trim().startsWith("You stole")) {
            let stolen = msgCtn[3].innerText;
            let resource = msgCtn[1].alt;
            operations.push([MY_USERNAME, +1, resource, "STOLE"]);
            operations.push([stolen, -1, resource, "GOT_STOLEN"]);

        } else {


            let action = msgCtn[1].textContent.trim().toLowerCase(); // Accion
            
            //console.log("Action:" + action)
            switch (true) {
                case action == "rolled": {
                    TURNS += 1;

                    let d1 = parseInt(msgCtn[2].alt.split("_")[1]);
                    let d2 = parseInt(msgCtn[4].alt.split("_")[1]);
                    operations.push([user, d1, d2, "DICE_DATA"]);
                    break;
                };

                case  action == "received starting resources": {
                    TURNS += 2;
                    for (let i = 0; i < msgCtn.length + 10  ; i++) {
                 
                        if (msgCtn[i]?.alt === undefined) {
                            continue;
                        }

                        let resource = msgCtn[i].alt.toLowerCase();
                        console.log("Starting resource: " + resource + " for user " + user)
                        if (resource) {
                            operations.push([user, +1, resource, "STARTING"]);
                        }
                    }
                    break;
                };

                case  action == "used": { // Uso de carta Monopoly. El siguiente mensaje muestra que se robó
                    // let used_card = msgCtn[2].textContent.trim().toLowerCase();
                    let used_card = logHtmlElement.children[0].children[2].textContent.trim().toLowerCase();
                              
                    if (used_card == MONOPOLY) {
                        PREVIOUS_IS_MONOPOLY = true;
                    }
                    USED_DEV_CARDS[used_card] += 1;

                    break;
                };

                case  action == "got": { // Entrega por dado o Year of Plenty (+2)
                    for (let i = 0; i < msgCtn.length + 10; i++) {
                   
                        if (msgCtn[i]?.alt === undefined) {
                            continue;
                        }
       
                        let resource = msgCtn[i].alt.toLowerCase();
                        if (resource) {
                            operations.push([user, +1, resource, "RECIEVED_FROM_BANK"]);
                        }
                    }
                    break;
                };
                
                case  action == "took from bank": {
                    for (let i = 0; i < msgCtn.length + 10; i++) {
                
                        if (msgCtn[i]?.alt === undefined) {
                            continue;
                        }

                        let resource = msgCtn[i].alt.toLowerCase();
                        if (resource) {
                            operations.push([user, +1, resource, "TOOK_FROM_BANK"]);
                        }
                    }
                    break;
                };

                case  action == "discarded": { // Descarte por tener mas del limite en dado 7
                    
                    for (let i = 0; i < msgCtn.length +10; i++) {
                    
                        if (msgCtn[i]?.alt == undefined) {
                            continue;
                        }
     
                        let resource = msgCtn[i].alt.toLowerCase();
                        if (resource) {
                            operations.push([user, -1, resource, "DISCARD"]);
                        }
                    }
                    break;
                };

                case  action == "gave bank": {
                    let op = -1;
                    for (let i = 2; i < msgCtn.length + 10; i++) {

                        if (msgCtn[i] == undefined) {
                            continue;
                        }

                        if (msgCtn[i].textContent.trim() == "and took") {
                            op = +1;
                        } else {
                     
                            if (msgCtn[i]?.alt == undefined) {
                                continue;
                            }
                   
                            let resource = msgCtn[i].alt.toLowerCase();
                            if (resource) {
                                operations.push([user, op, resource, "TRADE_BANK"]);
                            }
                        }
                    }
                    break;
                };

                case  action == "gave": { // Player trade
                    let l = parseInt(msgCtn.length) - 1;
                    let user2 = msgCtn[l].innerText;

                    let taker = user;
                    let giver = user2;

                    for (let i = 2; i < msgCtn.length - 1; i++) {
                        if (msgCtn[i].nodeType == 3) {
                            taker = user2;
                            giver = user;
                        } else {
                            let resource = msgCtn[i].alt.toLowerCase();

                            operations.push([taker, -1, resource, "TRADE_PLAYERS_GIVE"]);
                            operations.push([giver, +1, resource, "TRADE_PLAYERS_RECIEVE"]);
                        }
                    }
                    break;
                };

                case  action == "bought": { // Only dev???
        
                    
                    operations.push([user, -1, ORE, "PURCHASE_DEV"]);
                    operations.push([user, -1, GRAIN, "PURCHASE_DEV"]);
                    operations.push([user, -1, WOOL, "PURCHASE_DEV"]);
                    break;
                };

                case  action == "built a road": { // Build building
        
                        USERS_DATA[user][ROAD] += 1
                        operations.push([user, -1, LUMBER, "PURCHASE_ROAD"]);
                        operations.push([user, -1, BRICK, "PURCHASE_ROAD"]);
                        break;
                };
                
                case  action == "built a city": {
                        USERS_DATA[user][CITY] += 1
                        USERS_DATA[user][SETTLEMENT] -= 1
                        operations.push([user, -2, GRAIN, "PURCHASE_CITY"]);
                        operations.push([user, -3, ORE, "PURCHASE_CITY"]); 
                        break;
                };
                
                case  action == "built a settlement": {
                        USERS_DATA[user][SETTLEMENT] += 1
                        operations.push([user, -1, LUMBER, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, BRICK, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, WOOL, "PURCHASE_SETTLEMENT"]);
                        operations.push([user, -1, GRAIN, "PURCHASE_SETTLEMENT"]);
                        break;
                };

                case  action == "placed a road": { // Initial free
                    USERS_DATA[user][ROAD] += 1
                    break;
                };

                case  action == "placed a settlement": { // Initial free
                    USERS_DATA[user][SETTLEMENT] += 1
                    break;
                };

                case action.includes("stole"): {
                    let resource = msgCtn[2].alt.toLowerCase();
                    console.log("Resource stolen: " + resource)
                    if (action.includes("you")) { // stole you o You stol
                        operations.push([user, +1, resource, "STOLE"]);
                        operations.push([MY_USERNAME, -1, resource, "GOT_STOLEN"]);
                    } else {
                        let stoled = msgCtn[4].innerText;
                        operations.push([user, +1, resource, "STOLE"]);
                        operations.push([stoled, -1, resource, "STOLEN"]);
                    }
                    break;
                };
            }
        }

    } 
    catch (e) {
        console.error("Error parsing log message:", e);
    }

   return operations;
}

function execute_ops(operations) {
    for (let j = 0; j < operations.length; j++) {

        action = operations[j]
        log_action(action)

        let flag = action[3]
        if (flag == "DICE_DATA") {
            let roll_user = action[0]
            let d1 = action[1]
            let d2 = action[2]
            let total_roll = d1 + d2
            DICE_STATS[total_roll] += 1;

            if (total_roll == 7) { // Stats for those whinning players about unbalances stats
                USERS_DATA[roll_user]["7"] += 1
            }

            DICE_STATS["max"] = Math.max(...Object.values(DICE_STATS))
        } else {
            //console.log(actions[j])


            let user = action[0]; // Who to modify resources to
            let amount = parseInt(action[1]); // number of resource to add 
            let resource = action[2].toLowerCase(); //



            USERS_DATA[user][resource] += amount;

            if (flag == "MONOPOLY") {
                for (let player in USERS_DATA) {
                    if (player != user) {
                        USERS_DATA[player][resource] = 0;
                    }
                }
            }

        }
    }
   // console.log(USERS_DATA)
}

function log_action(action) {
    // Log actions with format
    let user = action[0];
    let amount = action[1];
    let resource = action[2];
    let flag = action[3];

    if (flag == "DICE_DATA") {
        console.log(`%c Turn ${TURNS}): ${user} rolled ${action[1] + action[2]}`, 'background: #222; color: #bada55')
    } else {
        console.log(`%c ${user}%c : ${(amount == 1) ? "+1" : amount} ${resource} (${flag})`, ` background: rgba(255, 255, 255, 0.6)`, '')
    }


}

// ------------------------  RENDERING FUNCTIONS ---------------------------------- //

function updateChart() {

    //document.getElementById("game-chat-input").value = ""

    // Update Resources
    Object.keys(USERS_DATA).forEach((user) => {

        let user_div = document.getElementById("userdiv_" + user)


        //console.log("Updating user: " + user)
        const dropd = () => {
            let el = document.getElementById(`dataholder_${user}`)
            if (el.classList.contains("hidden")) {
                el.classList.replace("hidden", "visible")
            } else {
                el.classList.replace("visible", "hidden")
            }

        }



        const element = document.getElementById(`drop_${user}`);
        if (element) {
            element.onclick = dropd;
        } else {
            //console.error(`Element drop_${user} not found!`);
        }
        if (!user_div) {
            addUserBlock(user)



        }

        let user7s = document.getElementById(`${user}_7s`)
        user7s.innerText = USERS_DATA[user]["7"]

        for (let resource of RESOURCES_LIST) {
            let user_res_div = document.getElementById(user + "_" + resource)
            let old_value = parseInt(user_res_div.innerText)
            let n = parseInt(USERS_DATA[user][resource]);
            user_res_div.innerText = n;
            
            //console.log(`${user} - ${resource} - ${n}`)
            if (n == 0) {
                document.getElementById(user + "_" + resource).style.visibility = "hidden"
            } else {
                document.getElementById(user + "_" + resource).style.visibility = "visible"

            }
            if (n != old_value) {
                user_res_div.animate(
                    [{
                            transform: 'scale(1)'
                        },
                        {
                            transform: 'scale(2)'
                        },
                        {
                            transform: 'scale(2)'
                        },
                        {
                            transform: 'scale(2)'
                        },
                        {
                            transform: 'scale(1)'
                        }
                    ], {
                        duration: 1000,
                        iterations: 1
                    }
                );
            }
        }


        document.getElementById(user + "_" + SETTLEMENT).innerText = MAX_INFRA[SETTLEMENT] - USERS_DATA[user][SETTLEMENT]
        document.getElementById(user + "_road").innerText = MAX_INFRA[ROAD] - USERS_DATA[user][ROAD]
        document.getElementById(user + "_city").innerText = MAX_INFRA[CITY] - USERS_DATA[user][CITY]

    });

    // Update cards
    document.getElementById("card_count_knight").innerText = `${USED_DEV_CARDS[KNIGHT]}`;
    document.getElementById("card_count_monopoly").innerText = `${USED_DEV_CARDS[MONOPOLY]}`;
    document.getElementById("card_count_yearofplenty").innerText = `${USED_DEV_CARDS[PLENTY]}`;
    document.getElementById("card_count_roadbuilding").innerText = `${USED_DEV_CARDS[ROAD2]}`;
    document.getElementById("card_count_all").innerText = 25 - USED_DEV_CARDS["BOUGHT"];

    // Update dice stats
    for (i = 2; i < 13; i++) {
        let e = document.getElementById("dice_stat_bar_" + i)
        if (DICE_STATS[i] == 0) {
            e.style.display = "none";
        } else {
            e.style.display = "block";
        }
        e.innerText = (DICE_STATS[i] == 0) ? "" : `    ${DICE_STATS[i]}`;
        e.style.width = DICE_STATS[i] * 80 / DICE_STATS["max"] + "px"
    }

}

function hiderButtonFuntion(buttonId, selector){
    const func = ()  => {
        console.log("Running for " + buttonId + " selector " + selector)
        let button = document.getElementById(buttonId)
        document.querySelectorAll(selector).forEach(element => {
            if (element.classList.contains("hidden")) {
                element.classList.replace("hidden", "visible")
                button.classList.replace("binactive", "bactive")
                button.innerText.replace("Show","Hide")
            } else if (element.classList.contains("visible")) {
                element.classList.replace("visible", "hidden")
                button.classList.replace("bactive", "binactive")
                button.innerText.replace("Hide","Show")
            } else {
                element.classList.add("hidden")
                button.classList.replace("bactive", "binactive")
                button.innerText.replace("Hide","Show")

            }
        });
    }
    return func;

}

function addInitialHtml() {

    // Big strings build
    let diceBlock = '<div class="block-sub-hr">Dice stats</div>';
    for (let n = 2; n <= 12; n++) {
        diceBlock += `<div class="block-data-container">
            <span class="dice-span">${n}</span>
            <div class="dice-bar" id="dice_stat_bar_${n}"></div>
        </div>`;
    }

    let htmlStringLeft = `
        <div class="main-extention-container left">
            <div class="blocks-container visible" id="users-block-container">
        </div>`
   
    let htmlStringRight = `
        <div class="main-extention-container right">
            <div class="blocks-container stats visible" id="stats-block-container">

                <div class="block stats-block">

                    <div class="block-sub-hr"> Played cards</div>
                    <div class="devctn">
                        <div class="block-data-container dev">
                            <img src="${CARD_ICON[KNIGHT]}" alt="">
                            <span id="card_count_knight" >0</span>
                        </div>
                        <div class="block-data-container dev">
                            <img src="${CARD_ICON[MONOPOLY]}" alt="">
                            <span id="card_count_monopoly" >0/2</span>
                        </div>
                        <div class="block-data-container dev">
                            <img src="${CARD_ICON[PLENTY]}" alt="">
                            <span id="card_count_yearofplenty" >0</span>
                        </div>
                        <div class="block-data-container dev">
                            <img src="${CARD_ICON[ROAD2]}" alt="">
                            <span id="card_count_roadbuilding" >0</span>
                        </div>
                    </div>

                    <div class="block-sub-hr"> Cards in bank</div>
                    <div class="block-data-container">
                        <img src="${CARD_ICON[DEV_CARD]}" alt="">
                        <span id="card_count_all" >25</span>
                    </div>
            
                    
                    ${diceBlock}
                </div>
            </div>
         </div>`

    let htmlMenuString = ` 
        
        <div class="extensions-settings-container hidden" id="extensions-settings-container"> 
        <div class="extensions-settings-container-mid" id="extensions-settings-container-mid" > 
        
        <div id="extensions-settings-close"> X </div>

        
        <div class="config-button-section-hr"> Charts  </div>
        <div class="config-button-section">
        <div class="config-button bactive" id="all">Hide user data</div>
        <div class="config-button bactive" id="stats">Hide game statistics</div>
        </div>
        
        <div class="config-button-section-hr"> User chart options  </div>
        <div class="config-button-section">
            <div class="config-button bactive" id="inf-r">Hide resources</div>
            <div class="config-button bactive" id="inf">Hide available buildings</div>
            <div class="config-button bactive" id="inf-7">Hide rolled 7s</div>
         </div>


        </div>
            
        </div>`
   
    // String additions
    console.log("Adding htmlStringLeft")
    document.body.insertAdjacentHTML('afterbegin', htmlStringLeft)
    console.log("Adding htmlStringRight")
    document.body.insertAdjacentHTML('afterbegin', htmlStringRight)
    console.log("Adding htmlMenuString")
    document.body.insertAdjacentHTML('afterbegin', htmlMenuString)


    // Functionalities attachment
    const switchMenu = () => {
        let el = document.getElementById(`extensions-settings-container`)
        let elm = document.getElementById(`extensions-settings-container-mid`)
        let cv = document.getElementById(`game-canvas`)


        let w = cv.style.width
        let h = cv.style.height

        elm.style.width = w
        elm.style.height = h


        if (el.classList.contains("hidden")) {
            el.classList.replace("hidden", "visible")
        } else {
            el.classList.replace("visible", "hidden")
        }
    };

    document.getElementById("extensions-settings-close").onclick = switchMenu

    document.getElementById("inf").onclick = hiderButtonFuntion("stats", '.user-block-section.building')
    document.getElementById("inf-r").onclick = hiderButtonFuntion("stats", ".stats-block-container.resources")
    document.getElementById("inf-7").onclick = hiderButtonFuntion("inf-7", ".stats-block-container.sevens")

    document.getElementById("stats").onclick = hiderButtonFuntion("stats", "#stats-block-container")
    document.getElementById("all").onclick = hiderButtonFuntion("all", "#users-block-container")
    // document.getElementById("bully-msg").onclick = bully
  

}

function addUserBlock(user) {
    let is_me = (MY_USERNAME == user) ? "me" : ""
    console.log("Adding user block for " + user)
    document.getElementById("users-block-container").innerHTML += `
        <div class="block user-block ${is_me}" id="userdiv_${user}">

            <div class="block-hr" id="drop_${user}" style="color:${USER_COLORMAP[user]};">${user}
            
            </div>

            <div class="user-block-section-data visible" id="dataholder_${user}">
           


            <div class="user-block-section resources">
          
                <div class="user-block-counter-resource">
                    <span id="${user}_lumber">0</span>
                    <img src="${CARD_ICON[LUMBER]}">
                </div>
                <div class="user-block-counter-resource">
                    <span id="${user}_brick">0</span>
                    <img src="${CARD_ICON[BRICK]}">
                </div>
                <div class="user-block-counter-resource">
                    <span id="${user}_wool">0</span>
                    <img src="${CARD_ICON[WOOL]}">
                </div>
                <div class="user-block-counter-resource">
                    <span id="${user}_grain">0</span>
                    <img src="${CARD_ICON[GRAIN]}">
                </div>
                <div class="user-block-counter-resource">
                    <span id="${user}_ore">0</span>
                    <img src="${CARD_ICON[ORE]}">
                </div>

   
            </div> <div class="user-block-section building">

                <div class="user-block-counter-building">
                    <img src="${ICONS_EXTRA[CITY]}">
                    <span id="${user}_city"></span>
                </div>
                <div class="user-block-counter-building">
                    <img src="${ICONS_EXTRA[SETTLEMENT]}">
                    <span id="${user}_settlement"></span>
                </div>
                <div class="user-block-counter-building">
                    <img src="${ICONS_EXTRA[ROAD]}">
                    <span id="${user}_road"></span>
                </div>

            </div>
            <div class="user-block-section sevens">

                <div class="user-block-counter-building">
                    <span >Rolled sevens: </span>
                    <span id="${user}_7s">0</span>
                </div>

            </div>
            </div>
        </div>`;
}