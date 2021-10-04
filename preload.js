const WebSocket = require("ws")
const liblokinet = require("liblokinet")
const path = require("path")

const DEBUG = true

const log = (msg) => {
    console.log(msg)
    if (DEBUG) {
        const _log = document.getElementById("log")
        if (_log)
            _log.appendChild(document.createTextNode(msg + "\n"))
    }
}

const lokinet = new liblokinet.Lokinet({
    bootstrap: path.join(__dirname, "contrib", "bootstrap.signed"),
    log: log
})

/// signalling port
const PORT = 8811

/// call data port
// const WEBRTC_PORT = 9999;

/// placeholder value for webrtc port
/// :^)
// const WEBRTC_PLACEHOLDER = '==YOLO=HEKKIN=SWAGGERINGS=420=BRUH=CHECK=THIS=PLACEHOLDER=VALUE==';

/// media settings for call
const MEDIA_SETTINGS = {
    audio: true,
    video: true
}

var wss
var wsc
var localip
var localaddr

const handleMsg = async (msg, inbound) => {
    try {
        if (msg.type === "video-offer") {
            await handleVideoOfferMsg(msg)
        }
        if (msg.type === "video-answer") {
            await handleVideoAnswerMsg(msg)
        }
        if (msg.type === "ice-candidate") {
            await handleNewICECandidateMsg(msg, inbound)
        }
        if (msg.type === "hang-up") {
            await closeVideoCall()
        }
    } catch (e) {
        log(`failed to handle control message "${msg.type}": ${e}`)
    }
}

const sendToRemote = (msg) => {
    if (wsc) {
        msg = JSON.stringify(msg)
        log("send to remote: " + msg)
        wsc.send(msg)
    }
}



var myPeerConnection

const closeVideoCall = async () => {
    var remoteVideo = document.getElementById("received_video")
    var localVideo = document.getElementById("local_video")

    if (myPeerConnection) {
        myPeerConnection.ontrack = null
        myPeerConnection.onremovetrack = null
        myPeerConnection.onremovestream = null
        myPeerConnection.onicecandidate = null
        myPeerConnection.oniceconnectionstatechange = null
        myPeerConnection.onsignalingstatechange = null
        myPeerConnection.onicegatheringstatechange = null
        myPeerConnection.onnegotiationneeded = null

        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop())
        }

        if (localVideo.srcObject) {
            localVideo.srcObject.getTracks().forEach(track => track.stop())
        }

        myPeerConnection.close()
        myPeerConnection = null
    }

    remoteVideo.removeAttribute("src")
    remoteVideo.removeAttribute("srcObject")
    localVideo.removeAttribute("src")
    remoteVideo.removeAttribute("srcObject")

    document.getElementById("hangup-button").disabled = true
    wsc.close()
    wsc = null
}

const hangUpCall = async () => {
    await closeVideoCall()
    sendToRemote({
        type: "hang-up"
    })
}

const handleSignalingStateChangeEvent = async (event) => {
    switch (myPeerConnection.signalingState) {
        case "closed":
            closeVideoCall()
            break
    }
}

const handleICEConnectionStateChangeEvent = (event) => {
    switch (myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
            closeVideoCall()
            break
    }
}

const handleICEGatheringStateChangeEvent = async (event) => {}

const handleTrackEvent = async (event) => {
    document.getElementById("received_video").srcObject = event.streams[0]
    document.getElementById("hangup-button").disabled = false
}

const handleVideoAnswerMsg = async (msg) => {
    await myPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
}

const handleVideoOfferMsg = async (msg) => {
    var localStream = null

    targetUsername = msg.name
    createPeerConnection()

    try {
        var desc = new RTCSessionDescription(msg.sdp)

        await myPeerConnection.setRemoteDescription(desc)
        localStream = await navigator.mediaDevices.getUserMedia(MEDIA_SETTINGS)
        document.getElementById("local_video").srcObject = localStream
        await localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream))

        const answer = await myPeerConnection.createAnswer()
        await myPeerConnection.setLocalDescription(answer)
        sendToRemote({
            type: "video-answer",
            sdp: myPeerConnection.localDescription
        })
    } catch (err) {
        log("error recving call: " + err)
        document.getElementById("hangup-button").disabled = false
    }
}

const handleNewICECandidateMsg = async (msg, inbound) => {
    const lokiaddr = msg.candidate.candidate.split(" ")[4]
    const candidate = JSON.parse(JSON.stringify(msg.candidate).replace(lokiaddr, localip))
    log("ice candidate:" + JSON.stringify(candidate))
    await myPeerConnection.addIceCandidate(new RTCIceCandidate(candidate))
}

const handleRemoveTrackEvent = async (event) => {
    var stream = document.getElementById("received_video").srcObject
    var trackList = stream.getTracks()

    if (trackList.length == 0) {
        closeVideoCall()
    }
}

const handleNegotiationNeededEvent = async () => {
    log("create offer")
    const offer = await myPeerConnection.createOffer()
    log(offer)
    await myPeerConnection.setLocalDescription(offer)
    sendToRemote({
        type: "video-offer",
        sdp: myPeerConnection.localDescription
    })
}

const handleICECandidateEvent = async (event) => {
    if (event.candidate) {
        const str = event.candidate.candidate
        const ip = str.split(" ")[4]
        const ownsIP = await lokinet.ownsAddress(ip)
        if (owns) {
            const localport = parseInt(str.split(" ")[5])
            const candidate = JSON.stringify(event.candidate).replace(` ${ip} `, ` ${localaddr} `)
            sendToRemote({
                type: "ice-candidate",
                candidate: JSON.parse(candidate)
            })
        } else
            log(`ingore candidate: ${str}`)
    }
}

const createPeerConnection = () => {
    myPeerConnection = new RTCPeerConnection({
        iceServers: []
    })
    myPeerConnection.onicecandidate = handleICECandidateEvent
    myPeerConnection.ontrack = handleTrackEvent
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent
    myPeerConnection.onremovetrack = handleRemoveTrackEvent
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent
}

const initCall = async () => {
    createPeerConnection()
    const localStream = await navigator.mediaDevices.getUserMedia(MEDIA_SETTINGS)
    document.getElementById("local_video").srcObject = localStream
    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream))
}

window.addEventListener("DOMContentLoaded", () => {
    const establish = document.getElementById("establish_button")
    establish.disabled = true
    const remote = document.getElementById("remote_addr_input")
    establish.addEventListener("click", async () => {
        const remoteaddr = remote.value
        if (remoteaddr.length == 0)
            return
        log("connecting to " + remoteaddr)
        const client = new WebSocket.WebSocket("ws://" + remoteaddr + ":" + PORT + "/", "ws", {
            agent: lokinet.httpAgent()
        })
        client.on("open", async () => {
            log("websocket opened")
            wsc = client
            wsc.on("message", async (message) => {
                const msg = JSON.parse(message)
                handleMsg(msg)
            })
            await initCall()
        })
    })
    const hangup = document.getElementById("hangup-button")
    hangup.addEventListener("click", hangUpCall)

    setTimeout(async () => {
        log("starting up lokinet...")
        await lokinet.start()
        log("getting lokinet address...")
        localaddr = await lokinet.hostname()
        localip = await lokinet.localip()
        const elem = document.getElementById("local_addr")
        elem.value = localaddr
        log("got localaddr " + localaddr)
        log("got localip " + localip)
        const closer = await lokinet.permitInboundTCP(PORT)
        wss = new WebSocket.Server({
            port: PORT,
            host: localip
        })
        wss.on("close", () => {
            closer()
        })
        wss.on("connection", async (ws) => {
            wsc = ws
            wsc.on("message", async (message) => {
                const msg = JSON.parse(message)
                log("WS inbound: " + message)
                await handleMsg(msg)
            })
        })
        log("we ready")
        establish.disabled = false
    }, 0)
})