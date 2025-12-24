var t = require('./test.json')

//console.log(t.answers[1].intent + ' ' + t.answers[1].answer)

var data = '[{"name" : "Hoffman", "age" : "100"},{"name" : "Sabine", "age" : "99"}]'

var mydata = JSON.parse(data)
console.log(mydata[0].name + ' ' + mydata[0].age) 