
const lokinet = require("./lokinet.js")

const log = (msg) => {
  const _log = document.getElementById("log");
  _log.appendChild(document.createTextNode(msg+"\n"));
}

const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8811 });
var wsc;
var localip;
var localaddr;

const handleMsg = async (msg) => {
  if(msg.type === "video-offer")
  {
    await handleVideoOfferMsg(msg);
  }
  if(msg.type === "video-answer")
  {
    await handleVideoAnswerMsg(msg);
  }
  if(msg.type === "ice-candidate")
  {
    await handleNewICECandidateMsg(msg);
  }
  if(msg.type === "hang-up")
  {
    await closeVideoCall();
  }
}
setTimeout(async () => {
  localaddr = await lokinet.localaddr();
  localip = await lokinet.localip();
  const elem = document.getElementById("local_addr");
  elem.value = localaddr;
  log("got localaddr " + localaddr);
  log("got localip "+ localip);
}, 1);

wss.on('connection', async (ws) => {
  wsc = ws;
  wsc.on('message', async (message) => {
    const msg = JSON.parse(message);
    log('WS inbound: ' + message);
    await handleMsg(msg);
  });
});

const sendToRemote = (msg) => {
  if(wsc)
  {
    console.log(msg);
    msg = JSON.stringify(msg);
    log("send to remote: "+msg);
    wsc.send(msg);
  }
}

       

var myPeerConnection;

const closeVideoCall = async () => {
  var remoteVideo = document.getElementById("received_video");
  var localVideo = document.getElementById("local_video");

  if (myPeerConnection) {
    myPeerConnection.ontrack = null;
    myPeerConnection.onremovetrack = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnegotiationneeded = null;

    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    myPeerConnection.close();
    myPeerConnection = null;
  }

  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");

  document.getElementById("hangup-button").disabled = true;
  wsc.close();
  wsc = null;
}

const hangUpCall = async () => {
  await closeVideoCall();
  sendToRemote({
    type: "hang-up"
  });
}

const handleSignalingStateChangeEvent = async (event) => {
  switch(myPeerConnection.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}

const handleICEConnectionStateChangeEvent = (event) => {
  switch(myPeerConnection.iceConnectionState) {
    case "closed":
    case "failed":
      closeVideoCall();
      break;
  }
}

const handleICEGatheringStateChangeEvent = async (event) => {
}

const handleTrackEvent = async (event) => {
  document.getElementById("received_video").srcObject = event.streams[0];
  document.getElementById("hangup-button").disabled = false;
}

const handleVideoAnswerMsg = async (msg) => {
  await myPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
}

const handleVideoOfferMsg = async (msg) => {
  var localStream = null;

  targetUsername = msg.name;
  createPeerConnection();

  var desc = new RTCSessionDescription(msg.sdp);

  await myPeerConnection.setRemoteDescription(desc);
  localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  document.getElementById("local_video").srcObject = localStream;

  await localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
  
  const answer = await myPeerConnection.createAnswer();
  await myPeerConnection.setLocalDescription(answer);
  sendToRemote({
      type: "video-answer",
      sdp: myPeerConnection.localDescription
  });
}

const handleNewICECandidateMsg = async (msg) => {
  const lokiaddr = msg.candidate.candidate.split(" ")[4];
  log(lokiaddr);
  const remoteip = await lokinet.addr_to_ip(lokiaddr);
  log(remoteip);
  const candidate = JSON.parse(JSON.stringify(msg.candidate).replace(lokiaddr, remoteip));
  log("ice candidate:" + JSON.stringify(candidate));
  await myPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

const handleRemoveTrackEvent = async (event) => {
  var stream = document.getElementById("received_video").srcObject;
  var trackList = stream.getTracks();

  if (trackList.length == 0) {
    closeVideoCall();
  }
}

const handleNegotiationNeededEvent = async () => {
  log("create offer");
  const offer =  await myPeerConnection.createOffer()
  log(offer);
  await myPeerConnection.setLocalDescription(offer);
  sendToRemote({
      type: "video-offer",
      sdp: myPeerConnection.localDescription
  });
}

const handleICECandidateEvent = async (event) => {
  if (event.candidate) {
    const str = event.candidate.candidate;
    log(str);
    if(str.split(" ")[4] === localip)
    {
      const candidate = JSON.stringify(event.candidate).replace(localip, localaddr);
      sendToRemote({
        type: "ice-candidate",
        candidate: JSON.parse(candidate)
      });
    }
  }
}

const createPeerConnection = () => {
  myPeerConnection = new RTCPeerConnection({
      iceServers: [     // Information about ICE servers - Use your own!
      ]
  });
  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

window.addEventListener('DOMContentLoaded', () => {
  const establish = document.getElementById("establish_button");
  const remote = document.getElementById("remote_addr_input");
  establish.addEventListener("click", async () => {
    const remoteaddr = remote.value;
    log("connecting to "+remoteaddr);
    const client = new WebSocket("ws://"+remoteaddr+":8811/");
    client.on("open", async () => {
      log("websocket opened");
      wsc = client;
      wsc.on('message', async (message) => {
        const msg = JSON.parse(message);
        handleMsg(msg);
      });
      createPeerConnection();
      const localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
      document.getElementById("local_video").srcObject = localStream;
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    });
  });
  const hangup = document.getElementById("hangup-button");
  hangup.addEventListener("click", hangUpCall);
})
