document.addEventListener('DOMContentLoaded', function() {
    const answers = new Array(40);
    let i = 0;
    let name = 'u1';
    
    // Connect to WebSocket server
    const socket = new WebSocket('ws://127.0.0.1:8181/', 'chat');
    
    socket.onopen = function() {
        name = "name" + Math.floor(Math.random() * 700);
        socket.send(JSON.stringify({
            type: "join",
            name: name
        }));
    };
    
    $('#sendBtn').on('click', function(e) {
        e.preventDefault();
        const msg = $('#msg').val();
        if (msg.trim() !== '') {
            socket.send(JSON.stringify({
                type: "msg",
                msg: msg,
                sender: name
            }));
            $('#msg').val('');
        }
    });
    
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'msg':
                if (data.name === name || 
                   (data.name === "MegaBot" && data.sender === name) || 
                   (data.name === "MegaBot" && data.sender === "MegaBot")) {
                    const messageClass = data.name === name ? 'sent' : 'received';
                    const msgElement = $(`
                        <div class="message ${messageClass}">
                            ${data.name}: ${data.msg}
                            <span class="message-time">${new Date().toLocaleTimeString()}</span>
                        </div>
                    `);
                    $('#msgs').append(msgElement);
                    answers[i] = data.msg;
                    i++;
                    $('#msgs').scrollTop($('#msgs')[0].scrollHeight);
                }
                break;
            case 'join':
                $('#users').empty();
                data.names.forEach(user => {
                    const userElement = $(`<div class="chat-item">${user}</div>`);
                    $('#users').append(userElement);
                });
                break;
        }
    };
    
    socket.onclose = function(event) {
        const msgElement = $(`
            <div class="message received">
                Connection closed: ${event.reason || 'Unknown reason'}
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `);
        $('#msgs').append(msgElement);
    };
    
    socket.onerror = function(error) {
        const msgElement = $(`
            <div class="message received">
                WebSocket error occurred
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `);
        $('#msgs').append(msgElement);
    };
});