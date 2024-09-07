// Author: santiago93echevarria@gmail.com
// 
// Chrome Extension to help keep track of Colonist resource exchanges
//

// ----------------------------  GLOBALS ------------------------------------ //

// Game keywords
const ROAD = "road";
const SETTLEMENT = "settlement";
const CITY = "city";

const LUMBER = "lumber";
const BRICK = "brick";
const GRAIN = "grain";
const WOOL = "wool";
const ORE = "ore";
const UNKNOWN_CARD = "card";

const MONOPOLY = "Monopoly";
const KNIGHT = "Knight";
const PLENTY = "Year of Plenty";
const ROAD2 = "Road Building";
const VP = "vp";
const DEV_CARD = "development card";
// Game configuration variables

let RESOURCES_LIST = [LUMBER, BRICK, GRAIN, WOOL, ORE]; //rescardback
let DEV_LIST = [KNIGHT, MONOPOLY, PLENTY, ROAD2]; //rescardback

// Scrapping variables
let LOG_WRAPPER_ID = "game-log-text" // Class Id of log wrapper
let CARD_ICON = {
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


// Aux global variables
let USER_COLORMAP = {};
let RESOURCES_DATA = {}; // User resources map
let MY_USERNAME = "";
let PREVIOUS_IS_MONOPOLY = false; // Aux variable for parsing monopoly log
let IS_OBSERVER_ACTIVE = false
let IS_DATA_ACTIVE = false;
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
    max: 0,
}

let USED_DEV_CARDS = {
    [KNIGHT]: 0,
    [MONOPOLY]: 0,
    [PLENTY]: 0,
    [ROAD2]: 0,
    [VP]: 0,
    "BOUGHT": 0
}

// --------------------  Build initial HTML containers  --------------------- //

const TOPBAR = document.createElement("div"); // Create top bar
TOPBAR.classList.add("top-bar");

const USER_DATA_WRAPPER = document.createElement("div"); // Div for data display
USER_DATA_WRAPPER.classList.add("user-div-wp")

TOPBAR.appendChild(USER_DATA_WRAPPER);
document.body.insertBefore(TOPBAR, document.body.firstChild);

// ------------------------   Inicializar  ---------------------------------- //

observeDOM();

// --------------------------   Funciones  ---------------------------------- //

function print(a) {
    console.log(a)
}

function observeDOM() {

    const targetId = LOG_WRAPPER_ID;

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.id === targetId) {
                        activate();
                        observer.disconnect();
                        break;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function activate() {
    // Activate funtion. Needs to called after logs div has loaded
    setUsername()
    removeAds();
    if (!IS_OBSERVER_ACTIVE) {
        startLogObserver();
    }
}

function setUsername() {
    MY_USERNAME = document.getElementById('header_profile_username').innerText;
    console.log(`Set username to ${MY_USERNAME}`);
}

function removeAds() {
    // Need to clean adds to place data. Also.. who likes ads?
    document.getElementById("in_game_ab_left").style.display = "none";
    document.getElementById("in_game_ab_right").style.display = "none";
    document.getElementById("in_game_ab_bottom").style.display = "none";
    document.getElementById("in_game_ab_bottom_small").style.display = "none";
}

function startLogObserver() {
    // Refresh data on changes on log element 
    const targetNode = document.getElementById(LOG_WRAPPER_ID);

    const observer = new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(node => {
                    if (!IS_DATA_ACTIVE) {
                        buildChart()
                        IS_DATA_ACTIVE = true;
                    }
                    let operations = msg2operations(node)
                    if (operations.length > 0) {
                        execute_ops(operations)
                    }

                })
                // refreshData();
            }
        }
    });

    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(targetNode, config);
    IS_OBSERVER_ACTIVE = true;
}

function execute_ops(operations) {
    for (let j = 0; j < operations.length; j++) {


        let flag = operations[j][3]
        if (flag == "DICE_DATA") {
            console.log("ROLLED " + operations[j][2])
            DICE_STATS[operations[j][2]] += 1;
            DICE_STATS["max"] = Math.max(...Object.values(DICE_STATS))
        }
        else {
            //console.log(actions[j])
            console.log(operations[j])
            let user = operations[j][0]; // Who to modify resources to
            let amount = operations[j][1]; // number of resource to add 
            let resource = operations[j][2]; //
            if (user) {
                if (!(user in RESOURCES_DATA)) { RESOURCES_DATA[user] = { [ORE]: 0, [WOOL]: 0, [BRICK]: 0, [GRAIN]: 0, [LUMBER]: 0, [UNKNOWN_CARD]: 0 }; }
            }


            RESOURCES_DATA[user][resource] += amount;
            if (flag == "MONOPOLY") {
                for (let player in RESOURCES_DATA) {
                    if (player != user) { RESOURCES_DATA[player][resource] = 0; }
                }
            }

        }
    }
    buildChart();
}

function addUserChart(user) {
    // A div per user
    let user_data = RESOURCES_DATA[user];
    let userdiv = document.createElement("div");
    let user_hr = document.createElement("div");
    userdiv.classList.add("user-div")
    userdiv.id = "userdiv_" + user

    user_hr.innerText = user;
    user_hr.classList.add("user-div-hr")

    let user_color = USER_COLORMAP[user];
    user_hr.style.color = user_color

    userdiv.appendChild(user_hr);
    for (i = 0; i < RESOURCES_LIST.length; i++) {

        let resource_div = document.createElement("div");
        resource_div.classList.add("resource-div")

        let r_img = document.createElement("img");
        r_img.classList.add("r_div_img")
        r_img.setAttribute("src", CARD_ICON[RESOURCES_LIST[i]]);

        let r_span = document.createElement("span");
        r_span.classList.add("r_div_span")
        r_span.id = user + "_" + RESOURCES_LIST[i]
        let n = user_data[RESOURCES_LIST[i]];
        r_span.innerText = (n == 0) ? "" : `    ${n}`  // Only show existing


        resource_div.appendChild(r_img);
        resource_div.appendChild(r_span);
        userdiv.appendChild(resource_div);

    }
    // Add updated chart
    USER_DATA_WRAPPER.append(userdiv);
}


function buildChart() {
    // Build graphical display of resources

    USER_DATA_WRAPPER.innerHTML = ""; // Needs to be cleared each time. Calculation is the sum of all logs
    Object.keys(RESOURCES_DATA).forEach((user) => {

        if (user != MY_USERNAME) {
            addUserChart(user)
        }

    });


    // STATS
    let stats_div = document.createElement("div");
    stats_div.classList.add("user-div")

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

        bar.style.width = DICE_STATS[i] * 80 / DICE_STATS["max"] + "px"
        if (DICE_STATS[i] !== 0) {
            bar.innerText = DICE_STATS[i];
        }

        number_div.appendChild(r_span);
        number_div.appendChild(bar);
        stats_div.appendChild(number_div);

    }
    // Add updated chart
    USER_DATA_WRAPPER.append(stats_div);





}


function msg2operations(htmlMsg) {
    // Parses html message into a list of operations
    // Return [(user, amount_to_add, resource, <FLAG>), ...]
    var operations = [];
    try {

        let msgCtn = htmlMsg.childNodes[1].childNodes;
        var user = htmlMsg.children[1].children[0].innerText.trim(); // no funciona para You Stole

        USER_COLORMAP[user] = htmlMsg.children[1].children[0].style.color // Solo al existir log puedo scrappear color de usuario
        // Si el mensaje anterior es que suó monopoly
        if (PREVIOUS_IS_MONOPOLY) {
            let resource = msgCtn[2].alt;
            let amount = parseInt(msgCtn[1].textContent.replace("stole", "").trim());
            operations.push([user, amount, resource, "MONOPOLY"]);
            PREVIOUS_IS_MONOPOLY = false;

            // Si el mensaje es You stole es una excepcion. (You se tiene que mapear a MY_USERNAME)
        } else if (htmlMsg.innerText.trim().startsWith("You stole")) {
            let stolen = msgCtn[3].innerText;
            let resource = msgCtn[1].alt;
            operations.push([MY_USERNAME, +1, resource]);
            operations.push([stolen, -1, resource, "YOU_STOLE"]);

        } else {
            let action = msgCtn[1].textContent.trim(); // Accion
            // print(action)
            switch (action) {
                case "rolled": {
                    let d1 = parseInt(msgCtn[2].alt.slice(-1));
                    let d2 = parseInt(msgCtn[4].alt.slice(-1));
                    operations.push([d1, d2, d1 + d2, "DICE_DATA"]);
                    break;
                };

                case "received starting resources": {
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
                    if (used_card == "Monopoly") {
                        PREVIOUS_IS_MONOPOLY = true;
                    }
                    USED_DEV_CARDS[used_card] += 1;

                    break;
                };

                case "got": { // Entrega por dado o Year of Plenty (+2)
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, +1, resource, "RECIEVED_BANK_1"]);
                        }
                    }
                    break;
                }
                case "took from bank": {
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        if (resource) {
                            operations.push([user, +1, resource, "RECIEVED_BANK_2"]);
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

                case "traded": {// Player trade
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
                        operations.push([MY_USERNAME, -1, resource, "STOLEN"]);
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


