// Create start button
const topBar = document.createElement('div');
topBar.classList.add('top-bar');
const button = document.createElement('button');
button.textContent = 'Get user resources';
topBar.appendChild(button);
document.body.insertBefore(topBar, document.body.firstChild);

button.addEventListener('click', buttonClick);
function buttonClick() {

    let data = {}

    let content = document.getElementById("game-log-text");

    for (let i = 0; i < content.childNodes.length; i++) {
        const child = content.children[i];
        let actions = parseMsg(child)


        // action interpretation
        for (let j = 0; j < actions.length; j++) {

            let user = actions[j][0];
            let operation = actions[j][1];
            let resource = actions[j][2];

            console.log([user, operation, resource])

            if (user ) {
                if (!(user in data)) {
                    data[user] = {
                        'ore': 0,
                        'wool': 0,
                        'brick': 0,
                        'grain': 0,
                        'lumber': 0,
                        'TOTAL':0,
                    };
                }
            }

            if (operation == '+') {
                data[user][resource] += 1;
                data[user]['TOTAL'] += 1;
            }
            else if (operation == '-') {
                data[user][resource] -= 1;
                data[user]['TOTAL'] -= 1;
            }
        }






    }
    console.log(data)
}

// msg -> [(user, '+', 'ore'), (),...]


function parseMsg(htmlMsg) {
    var actions = []

    try {
        var user = htmlMsg.children[1].children[0].innerText; // no funciona para You Stole
        let msgData = htmlMsg.childNodes[1]
        let activity = msgData.childNodes[1].textContent.trim();
        console.log(activity)


        if (activity == 'received starting resources') {
            for (let i = 2; i < msgData.childNodes.length; i++) {
                let resource = msgData.childNodes[i].alt;
                actions.push([user,'+', resource])
            }

        }
        else 
        if (activity == 'got') {
            for (let i = 2; i < msgData.childNodes.length; i++) {
                let resource = msgData.childNodes[i].alt;
                actions.push([user, '+', resource])
            }

        }
        else 
        if (activity == 'gave bank') {
            let op = '-'
            for (let i = 2; i < msgData.childNodes.length; i++) {
                if (msgData.childNodes[i].nodeType == 3) {
                    op = '+'
                }
                else {
                    let resource = msgData.childNodes[i].alt;
                    actions.push([user, op, resource])
                }
            }
        }
        else 
        if (activity == 'traded'){
            
            let l=parseInt(msgData.childNodes.length )-1;
            let user2 = msgData.childNodes[l].innerText;

            let taker = user;
            let giver = user2;
          
            for (let i = 2; i < msgData.childNodes.length-1; i++) {
                if (msgData.childNodes[i].nodeType == 3) {
                    taker = user2
                    giver = user
                }
                else {
                    let resource = msgData.childNodes[i].alt;
                   
                    actions.push([taker, '-', resource])
                    actions.push([giver, '+', resource])
                }
            }
        }
        else 
        if (activity == 'bought'){
            let b_item = msgData.childNodes[2].alt;
            if (b_item == 'development card'){
                    actions.push([user, '-', 'wool'])
                    actions.push([user, '-', 'grain'])
                    actions.push([user, '-', 'ore'])
            }          
        }
        else 
        if (activity == 'built a'){
            let b_item = msgData.childNodes[2].alt;
            if (b_item == 'road'){
                    actions.push([user, '-', 'lumber'])
                    actions.push([user, '-', 'brick'])
            }
            else if(b_item == 'city'){
                actions.push([user, '-', 'grain'])
                actions.push([user, '-', 'grain'])
                actions.push([user, '-', 'ore'])
                actions.push([user, '-', 'ore'])
                actions.push([user, '-', 'ore'])
            }   
            else if(b_item == 'settlement'){
                actions.push([user, '-', 'lumber'])
                actions.push([user, '-', 'brick'])
                actions.push([user, '-', 'wool'])
                actions.push([user, '-', 'grain'])
            }            
        }
        else 
        if (activity == 'You stole'){
             console.log("you stole!")
        }




//discarded
//stole
// monopoly
// +2
// stole from You ?






    } catch (e) { }


    return actions
}


    