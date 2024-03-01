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


const me="esantix"

// in_game_ab_left

function parseMsg(htmlMsg) {
    //
    // Return [(user, '+', resource), ...]
    var actions = []

    try {
        let msgCtn =  htmlMsg.childNodes[1].childNodes;
        var user = htmlMsg.children[1].children[0].innerText.trim(); // no funciona para You Stole


        if (htmlMsg.innerText.trim().startsWith('You stole')){ // You steal TODO: identify user mapping

             let stoled = msgCtn[3].innerText;
             let resource = msgCtn[1].alt;
     
             actions.push([me, '+', resource])
             actions.push([stoled, '-', resource])

        }
        else{

        let activity = msgCtn[1].textContent.trim();
      
        if (activity == 'received starting resources') { // beginning
            for (let i = 2; i < msgCtn.length; i++) {
                let resource = msgCtn[i].alt;
                actions.push([user,'+', resource])
            }

        }
        else 
        if (activity == 'got' || activity == 'took from bank') { // by dice or Year of plenty
            for (let i = 2; i < msgCtn.length; i++) {
                let resource = msgCtn[i].alt;
                actions.push([user, '+', resource])
            }
        }
        else 
        if (activity == 'discarded') { // discard by 7
            for (let i = 2; i < msgCtn.length; i++) {
                let resource = msgCtn[i].alt;
                actions.push([user, '-', resource])
            }
        }
        else 
        if (activity == 'gave bank') { // bank trade
            let op = '-'
            for (let i = 2; i < msgCtn.length; i++) {
                if (msgCtn[i].nodeType == 3) {
                    op = '+'
                }
                else {
                    let resource = msgCtn[i].alt;
                    actions.push([user, op, resource])
                }
            }
        }
        else 
        if (activity == 'traded'){ // Player trade
            
            let l=parseInt(msgCtn.length )-1;
            let user2 = msgCtn[l].innerText;

            let taker = user;
            let giver = user2;
          
            for (let i = 2; i < msgCtn.length-1; i++) {
                if (msgCtn[i].nodeType == 3) {
                    taker = user2
                    giver = user
                }
                else {
                    let resource = msgCtn[i].alt;
                   
                    actions.push([taker, '-', resource])
                    actions.push([giver, '+', resource])
                }
            }
        }
        else 
        if (activity == 'bought'){ // buy dev card
            let b_item = msgCtn[2].alt;
            if (b_item == 'development card'){
                    actions.push([user, '-', 'wool'])
                    actions.push([user, '-', 'grain'])
                    actions.push([user, '-', 'ore'])
            }          
        }
        else 
        if (activity == 'built a'){  // Build infra
            let b_item = msgCtn[2].alt;
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
        if (activity == 'stole'){ 

            let resource = msgCtn[2].alt;
            console.log(`${user} stole ${resource}`)
            
            if( msgCtn.length == 4 ){ // stole you o You stol
                actions.push([user, '+', resource])
                actions.push([me, '-', resource])
            }
            else{
                let stoled = msgCtn[4].innerText;
                actions.push([user, '+', resource])
                actions.push([stoled, '-', resource])
                
            }

            
        }

    }
// monopoly






    } catch (e) { }


    return actions
}


    