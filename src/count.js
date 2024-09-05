// Author: santiago93echevarria@gmail.com
// 
// Chrome Extension to help keep track of Colonist resource exchanges
//

// ----------------------------  GLOBALS ------------------------------------ //

// Game keywords
let ROAD = "road";
let SETTLEMENT = "settlement";
let CITY = "city";
let DEV_CARD = "development card";
let LUMBER = "lumber";
let BRICK = "brick";
let GRAIN = "grain";
let WOOL = "wool";
let ORE = "ore";
let UNKNOWN_CARD = "card";

// Game configuration variables
let START_RESOURCES = {ORE: 0, WHOOL: 0, BRICK: 0, GRAIN: 0, LUMBER: 0, CARD: 0};
let RESOURCES_LIST = [LUMBER, BRICK, GRAIN, WOOL, ORE, UNKNOWN_CARD]; //rescardback

// Scrapping variables
let LOG_WRAPPER_ID = "game-log-text" // Class Id of log wrapper
let CARD_ICON = {
    LUMBER: "/dist/images/card_lumber.svg",
    BRICK: "/dist/images/card_brick.svg",
    GRAIN: "/dist/images/card_grain.svg",
    WOOL: "/dist/images/card_wool.svg",
    ORE: "/dist/images/card_ore.svg",
    UNKNOWN_CARD: "/dist/images/card_rescardback.svg"
};

// Aux global variables
let USER_COLORMAP = {};
let RESOURCES_DATA = {}; // User resources map
let MY_USERNAME = "";
let PREVIOUS_IS_MONOPOLY = false; // Aux variable for parsing monopoly log
let IS_OBSERVER_ACTIVE = false

// --------------------  Build initial HTML containers  --------------------- //

const TOPBAR = document.createElement("div"); // Create top bar
TOPBAR.classList.add("top-bar");

const user_info_wrapper = document.createElement("div"); // Div for data display
user_info_wrapper.classList.add("user-div-wp")

TOPBAR.appendChild(user_info_wrapper);
document.body.insertBefore(TOPBAR, document.body.firstChild);

// ------------------------   Inicializar  ---------------------------------- //

observeDOM();

// --------------------------   Funciones  ---------------------------------- //

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
    console.log(`username = ${MY_USERNAME}`);
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
                refreshData();
            }
        }
    });
    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(targetNode, config);
    IS_OBSERVER_ACTIVE = true
}

function refreshData() {
    // Calculate all user data.

    RESOURCES_DATA = {}; // Reset all data
    let content = document.getElementById(LOG_WRAPPER_ID);

    for (let i = 0; i < content.childNodes.length; i++) {
        const log_item = content.children[i];

        let actions = parseMsg(log_item); // A message (log item) is a collection of actions to take
        
        // Apply action
        for (let j = 0; j < actions.length; j++) {
            
            let user = actions[j][0]; // Who to modify resources to
            let amount = actions[j][1]; // number of resource to add 
            let resource = actions[j][2]; //

            let flag = null;
            if (actions[j].length == 4){
                flag = actions[j][3]
            };

            if (user) {
                if (!(user in RESOURCES_DATA)) { RESOURCES_DATA[user] = START_RESOURCES;}
            }

            RESOURCES_DATA[user][resource] += amount;
            if (flag == "MONOPOLY"){
                for (let player in RESOURCES_DATA) {
                    if (player != user) { RESOURCES_DATA[player][resource] = 0;}
                }
            }
        }
    }

    buildChart();
}

function buildChart() {
    // Build graphical display of resources


    user_info_wrapper.innerHTML = ""; // Needs to be cleared each time. Calculation is the sum of all logs
    Object.keys(RESOURCES_DATA).forEach((user) => {

        if (user != MY_USERNAME) {
            // A div per user
            let user_data = RESOURCES_DATA[user];
            let userdiv = document.createElement("div");
            let user_hr = document.createElement("div");
            userdiv.classList.add("user-div")

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
                let r_span = document.createElement("span");
                r_span.classList.add("r_div_span")
                
                r_img.setAttribute("src", CARD_ICON[RESOURCES_LIST[i]]);
                let n = user_data[RESOURCES_LIST[i]];
                r_span.innerText = (n == 0) ? "" : `    ${n}`  // Only show existing
      
            
                resource_div.appendChild(r_img);
                resource_div.appendChild(r_span);
                userdiv.appendChild(resource_div);
          
            }
            // Add updated chart
            user_info_wrapper.append(userdiv);
        }
    });
}

function parseMsg(htmlMsg) {
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
            operations.push([stolen, -1, resource]);

        } else {
            let action = msgCtn[1].textContent.trim(); // Accion

            switch(action){
                case "received starting resources":
                    for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                        operations.push([user, +1, resource]);
                        };
                    break;
                
                case "used": // Uso de carta Monopoly. El siguiente mensaje muestra que se robó
                    let used_card = msgCtn[2].innerText.trim();
                    if (used_card == "Monopoly") {
                        PREVIOUS_IS_MONOPOLY = true;
                        }
                    break;

                case "got": // Entrega por dado o Year of Plenty (+2)
                case "took from bank": 
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        operations.push([user, +1, resource]);
                        }  
                
                case "discarded": // Descarte por tener mas del limite en dado 7
                    for (let i = 2; i < msgCtn.length; i++) {
                        let resource = msgCtn[i].alt;
                        operations.push([user, -1, resource]);
                    }

                case "gave bank": // Descarte por sacar 7
                    let op = -1;
                    for (let i = 2; i < msgCtn.length; i++) {
                        if (msgCtn[i].textContent.trim() == "and took") {
                            op = +1;
                            }
                        else {
                            let resource = msgCtn[i].alt;
                            operations.push([user, op, resource]);
                            }
                        }

                case "traded": // Player trade
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

                            operations.push([taker, -1, resource]);
                            operations.push([giver, +1, resource]);
                        }
                    }

                case "bought": // buy dev card
                    let item = msgCtn[2].alt;
                    if (item == "development card") {
                        operations.push([user, -1, WOOL]);
                        operations.push([user, -1, GRAIN]);
                        operations.push([user, -1, ORE]);
                    }

                case "built a":// Build infra
                    let b_item = msgCtn[2].alt;
                    if (b_item == "road") {
                        operations.push([user, -1, LUMBER]);
                        operations.push([user, -1, BRICK]);
                        } 
                    else if (b_item == "city") {
                        operations.push([user, -2, GRAIN]);
                        operations.push([user, -3, ORE]);
                        } 
                    else if (b_item == "settlement") {
                        operations.push([user, -1, LUMBER]);
                        operations.push([user, -1, BRICK]);
                        operations.push([user, -1, WOOL]);
                        operations.push([user, -1, GRAIN]);
                        }

                case "stole":
                    let resource = msgCtn[2].alt;
                    if (msgCtn.length == 4) { // stole you o You stol
                        operations.push([user, +1, resource]);
                        operations.push([MY_USERNAME, -1, resource]);
                        }    
                    else {
                        let stoled = msgCtn[4].innerText;
                        operations.push([user, +1, resource]);
                        operations.push([stoled, -1, resource]);
                        }
            }
        }
    } catch (e) { }

    return operations;
}


