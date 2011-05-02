var socket = new io.Socket(null); 
socket.connect();
socket.send('hi');