document.addEventListener('DOMContentLoaded', function() {
    let name = 'u1';
    
    // Connect to WebSocket server
    const socket = new WebSocket('ws://127.0.0.1:8181/', 'chat');
    
    socket.onopen = function() {
        // Assign a random user name
        name = "user" + Math.floor(Math.random() * 1000);
        socket.send(JSON.stringify({
            type: "join",
            name: name
        }));
    };
    
    // Send message on button click
    $('#sendBtn').on('click', function(e) {
        e.preventDefault();
        const msg = $('#msg').val();
        if (msg.trim() !== '') {
            socket.send(JSON.stringify({
                type: "msg",
                msg: msg,
                sender: name
            }));
            
            // Add the message to the chat immediately
            const msgElement = $(`
                <div class="message sent">
                    <strong>You:</strong> ${msg}
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
            `);
            $('#msgs').append(msgElement);
            $('#msgs').scrollTop($('#msgs')[0].scrollHeight);
            
            $('#msg').val('');
        }
    });
    
    // Handle incoming messages
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'msg':
                // Show message if it's from bot OR from other users (not yourself)
                if (data.name === 'RestaurantBot' || data.sender !== name) {
                    const messageClass = data.name === name ? 'sent' : 'received';
                    const senderName = data.name === 'RestaurantBot' ? 'Restaurant Bot' : data.name;
                    
                    const msgElement = $(`
                        <div class="message ${messageClass}">
                            <strong>${senderName}:</strong> ${data.msg}
                            <span class="message-time">${new Date().toLocaleTimeString()}</span>
                        </div>
                    `);
                    $('#msgs').append(msgElement);
                    $('#msgs').scrollTop($('#msgs')[0].scrollHeight);
                }
                break;
            
            case 'join':
                // Update user list, excluding current user
                $('#users').empty();
                $('#users').append(`
                    <div class="chat-item active">
                        <div class="chat-preview">Welcome to our restaurant!</div>
                        <div class="chat-time">Today</div>
                    </div>
                `);
                
                data.names.forEach(user => {
                    if (user !== name) {
                        const userElement = $(`
                            <div class="chat-item">
                                <div class="chat-preview">${user}</div>
                                <div class="chat-time">Today</div>
                            </div>
                        `);
                        $('#users').append(userElement);
                    }
                });
                break;
        }
    };
    
    // Handle socket close event
    socket.onclose = function() {
        const msgElement = $(`
            <div class="message received">
                <strong>System:</strong> Connection closed
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `);
        $('#msgs').append(msgElement);
    };
    
    // Handle socket error event
    socket.onerror = function() {
        const msgElement = $(`
            <div class="message received">
                <strong>System:</strong> Connection error
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `);
        $('#msgs').append(msgElement);
    };
});