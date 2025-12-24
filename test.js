var intents = require('./test.json')

//console.log(intents.answers[1].intent + ' ' + intents.answers[1].answer)

var nachricht = 'ich will Bestellen'

nachricht = nachricht.toLowerCase()

for (var j = 0 ;j<intents.answers.length ;j++) {
 if (nachricht.includes(intents.answers[j].intent)) {
      console.log(intents.answers[j].answer)
    }
}
