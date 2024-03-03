// Author: santiago93echevarria@gmail.com
// 
// Chrome Extension to help keep track of Colonist resource exchanges
//
//
// Works as of 1st March 2024
//
//

// Create top bar
const topBar = document.createElement("div");
topBar.classList.add("top-bar");

// start button
const button = document.createElement("button");
button.textContent = "Resource counter";
button.addEventListener("click", activate);

// Div for data display
const CHART = document.createElement("div");

topBar.appendChild(button);
topBar.appendChild(CHART);
document.body.insertBefore(topBar, document.body.firstChild);


let data = {}; // User resources map
let RESOURCES_LIST = ["lumber", "brick", "grain", "wool", "ore", "card"]; //rescardback
const me = "esantix"; // TODO: read value from page
let is_monopoly = false; // Aux variable for parsing monopoly log

function activate() {
    // Activate funtion. Needs to called after logs div has loaded
    removeAds();
    observeChanges();
}

function removeAds() {
    // Need to clean adds to place data. Also.. who likes ads?
    document.getElementById("in_game_ab_left").style.display = "none";
    document.getElementById("in_game_ab_right").style.display = "none";
    document.getElementById("in_game_ab_bottom").style.display = "none";
    document.getElementById("in_game_ab_bottom_small").style.display = "none";
}

function observeChanges() {
    // Refresh data on changes on log element 
    const targetNode = document.getElementById("game-log-text");
    const observer = new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                const content = targetNode.innerHTML;
                refreshData();
            }
        }
    });
    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(targetNode, config);
}

function buildChart() {
    // Build graphical display of resources


    CHART.innerHTML = ""; // Needs to be cleared each time. Calculation is the sum of all logs
    Object.keys(data).forEach((user) => {

        // A div per user
        let user_data = data[user];
        let userdiv = document.createElement("div");
        userdiv.innerText = user;
        userdiv.style.color = 'black';

        for (i = 0; i < RESOURCES_LIST.length; i++) {

            let resource_div = document.createElement("div");
            resource_div.style.display = "flex";

            let r_img = document.createElement("img");
            r_img.setAttribute("height", "23");

            let r_span = document.createElement("span");
            let n = user_data[RESOURCES_LIST[i]];

            // "card" resource is special since actual resource is not shown. 
            // Whan cards are used the calculation can be wrong. but this gives sense of error margins
            if (RESOURCES_LIST[i] == "card") {
                r_img.setAttribute("src", `/dist/images/card_rescardback.svg`);
                r_span.style.color = 'black';
                r_span.innerText = `     ${(n < 0 ? "" : "+") + n}`;
                (n < 0 ? "" : "+") + n // Show sign alwys
            } else {
                r_img.setAttribute("src", `/dist/images/card_${RESOURCES_LIST[i]}.svg`);
                r_span.innerText = `    ${n}`;
                r_span.style.color = 'white';
            }
            
            // Only show existing
            if (user_data[RESOURCES_LIST[i]] != 0) {
                resource_div.appendChild(r_img);
                resource_div.appendChild(r_span);
                userdiv.appendChild(resource_div);
            }
        }

        // Add updated chart
        CHART.append(userdiv);
    });
}

function refreshData() {
    // Calculate all user data

    data = {};
    let content = document.getElementById("game-log-text"); 

    for (let i = 0; i < content.childNodes.length; i++) {
        const child = content.children[i];

        let actions = parseMsg(child); // A message (log item) is a collection of actions to take

        // action interpretation
        for (let j = 0; j < actions.length; j++) {

            let user = actions[j][0]; // Who to modify resources to
            let operation = actions[j][1]; // "+" adds 1; "-1" deducts 1; <number> adds that value (only for monopoly)
            let resource = actions[j][2]; //

            if (user) {
                if (!(user in data)) {
                    data[user] = { ore: 0,wool: 0,brick: 0,grain: 0,lumber: 0, card: 0,
                    };
                }
            }

            //
            if (operation == "+") {
                data[user][resource] += 1;
                console.log([user, "+1", resource]);
            } else if (operation == "-") {
                data[user][resource] -= 1;
                console.log([user, "-1", resource]);
            } else if (typeof operation == "number") {
                let amount = operation; // for monopoly operation is the number
                data[user][resource] += amount;
                console.log([user, `+${amount}`, resource]);

                for (let user2 in data) {
                    if (user2 != user) {
                        data[user2][resource] = 0;
                        console.log([user2, "=0", resource]);
                    }
                }
            }
        }
    }
    console.log(data);
    buildChart();
}

function parseMsg(htmlMsg) {
    //
    // Return [(user, '+', resource), ...]
    var actions = [];

    try {
        let msgCtn = htmlMsg.childNodes[1].childNodes;
        var user = htmlMsg.children[1].children[0].innerText.trim(); // no funciona para You Stole

        if (is_monopoly) {
            is_monopoly = false;
            let resource = msgCtn[2].alt;
            let amount = parseInt(msgCtn[1].textContent.replace("stole", "").trim());

            actions.push([user, amount, resource]);
        } else if (htmlMsg.innerText.trim().startsWith("You stole")) {
            // You steal TODO: identify user mapping

            let stoled = msgCtn[3].innerText;
            let resource = msgCtn[1].alt;

            actions.push([me, "+", resource]);
            actions.push([stoled, "-", resource]);
        } else {
            let activity = msgCtn[1].textContent.trim();

            if (activity == "received starting resources") {
                // beginning
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "+", resource]);
                }
            } else if (activity == "used") {
                let used_card = msgCtn[2].innerText.trim();
                if (used_card == "Monopoly") {
                    is_monopoly = true;
                }
            } else if (activity == "got" || activity == "took from bank") {
                // by dice or Year of plenty
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "+", resource]);
                }
            } else if (activity == "discarded") {
                // discard by 7
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "-", resource]);
                }
            } else if (activity == "gave bank") {
                // bank trade
                let op = "-";
                for (let i = 2; i < msgCtn.length; i++) {
                    if (msgCtn[i].nodeType == 3) {
                        op = "+";
                    } else {
                        let resource = msgCtn[i].alt;
                        actions.push([user, op, resource]);
                    }
                }
            } else if (activity == "traded") {
                // Player trade
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

                        actions.push([taker, "-", resource]);
                        actions.push([giver, "+", resource]);
                    }
                }
            } else if (activity == "bought") {
                // buy dev card
                let b_item = msgCtn[2].alt;
                if (b_item == "development card") {
                    actions.push([user, "-", "wool"]);
                    actions.push([user, "-", "grain"]);
                    actions.push([user, "-", "ore"]);
                }
            } else if (activity == "built a") {
                // Build infra
                let b_item = msgCtn[2].alt;
                if (b_item == "road") {
                    actions.push([user, "-", "lumber"]);
                    actions.push([user, "-", "brick"]);
                } else if (b_item == "city") {
                    actions.push([user, "-", "grain"]);
                    actions.push([user, "-", "grain"]);
                    actions.push([user, "-", "ore"]);
                    actions.push([user, "-", "ore"]);
                    actions.push([user, "-", "ore"]);
                } else if (b_item == "settlement") {
                    actions.push([user, "-", "lumber"]);
                    actions.push([user, "-", "brick"]);
                    actions.push([user, "-", "wool"]);
                    actions.push([user, "-", "grain"]);
                }
            } else if (activity == "stole") {
                let resource = msgCtn[2].alt;

                if (msgCtn.length == 4) {
                    // stole you o You stol
                    actions.push([user, "+", resource]);
                    actions.push([me, "-", resource]);
                } else {
                    let stoled = msgCtn[4].innerText;

                    actions.push([user, "+", resource]);
                    actions.push([stoled, "-", resource]);
                }
            }
        }
    } catch (e) { }

    return actions;
}
