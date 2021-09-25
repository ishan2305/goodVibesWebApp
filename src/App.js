import "./styles.css";
import React, { Component, useState, useEffect } from "react";
import Header from "./header.jsx";
import Footer from "./footer";

import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, orderBy } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  where
} from "firebase/firestore";
import Button from "@material-ui/core/Button";
import Input from "@material-ui/core/Input";

import { useAuthState } from "react-firebase-hooks/auth";
import { userCollectionData } from "react-firebase-hooks/firestore";
import ReactPlayer from "react-player";

const firebaseConfig = {
  apiKey: "AIzaSyA0S0adFQaJhtOZJLZhY8Btl1NcWU3ybcE",
  authDomain: "good-vibes-586f5.firebaseapp.com",
  projectId: "good-vibes-586f5",
  storageBucket: "good-vibes-586f5.appspot.com",
  messagingSenderId: "497704218818",
  appId: "1:497704218818:web:bce743f13db98a88b58b5b"
};
const app = initializeApp(firebaseConfig);

const auth = getAuth();
//const currentUserUid = auth.currentUser.uid;
const firestore = getFirestore();

export default function App() {
  const [user] = useAuthState(auth);
  const [roomKey, setRoomKey] = useState("");

  return (
    <div className="App">
      <section>
        {user ? (
          roomKey === "" ? (
            <Room roomKey={roomKey} setRoomKey={setRoomKey} />
          ) : (
            <ChatRoom roomKey={roomKey} setRoomKey={setRoomKey} />
          )
        ) : (
          <SignIn />
        )}
      </section>
    </div>
  );
}

function Room(props) {
  const [tempKey, setTempKey] = useState("");
  const [errormsg, setErrorMsg] = useState(false);

  const createNewRoom = async (e) => {
    e.preventDefault();
    const docRef = await addDoc(collection(firestore, "videoData"), {
      url: "",
      playing: false
    });

    props.setRoomKey(docRef.id);
    console.log("got room key");
    console.log(docRef.id);
  };

  const enterRoom = async (e) => {
    e.preventDefault();
    console.log(tempKey);
    const docRef = doc(firestore, "videoData", tempKey.trim());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      props.setRoomKey(tempKey.trim());
    } else {
      // doc.data() will be undefined in this case
      setErrorMsg(true);
      console.log("No such document!");
    }
    setTempKey("");
  };

  return (
    <div>
      <Header />
      <Button
        onClick={() => {
          props.setRoomKey("");
          auth.signOut();
        }}
        className="SignInButton"
        size="large"
        variant="contained"
        color="error"
      >
        Sign Out
      </Button>
      <br />
      <br />
      <br />
      <h1 className="roomText">Create New Room</h1>
      <form onSubmit={createNewRoom}>
        <Button
          className="SignInButton"
          size="large"
          variant="contained"
          color="error"
          type="submit"
        >
          Create
        </Button>
      </form>
      <br />
      <h1 className="roomText">Or</h1>
      <br />
      <h1 className="roomText">Enter Room Key</h1>
      <form onSubmit={enterRoom}>
        <Input
          className="roomInput"
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          placeholder="Room ID"
          variant="outlined"
        />
        <Button
          type="submit"
          className="SignInButton"
          size="large"
          variant="contained"
          color="error"
          type="submit"
        >
          Enter
        </Button>
      </form>
      {errormsg ? <h1 className="roomText">No directory found</h1> : <h1></h1>}
    </div>
  );
}

function SendMessage(props) {
  const [typdMsg, settypdMsg] = useState("");

  const sendTypedMessage = async (e) => {
    e.preventDefault();
    if (typdMsg === "!play") {
      //props.setPlaying = true;
      console.log("video should play");

      // Set the "capital" field of the city 'DC'
      await updateDoc(doc(firestore, "videoData", props.roomKey), {
        playing: true
      });
    } else if (typdMsg === "!pause") {
      //props.setPlaying = false;
      console.log("video should pause");
      await updateDoc(doc(firestore, "videoData", props.roomKey), {
        playing: false
      });
    } else {
      if (typdMsg[0] === "!") {
        var newURL = "";
        for (var i = 1; i < typdMsg.length; i++) {
          newURL += typdMsg[i];
        }
        console.log(newURL);
        await updateDoc(doc(firestore, "videoData", props.roomKey), {
          url: newURL
        });
      } else {
        const now = new Date();
        const { uid, photoURL } = auth.currentUser;
        console.log(typdMsg);
        const docRef = await addDoc(collection(firestore, "messages"), {
          text: typdMsg,
          photoURL,
          uid,
          createdAt: now,
          roomID: props.roomKey
        });
        console.log("message created");
      }
    }

    settypdMsg("");
  };
  return (
    <div className="sendMsg">
      <form onSubmit={sendTypedMessage}>
        <Input
          className="roomInput"
          value={typdMsg}
          onChange={(e) => settypdMsg(e.target.value)}
          placeholder="Message..."
        />
        <Button
          className="SignInButton"
          size="large"
          variant="contained"
          color="error"
          type="submit"
        >
          Send
        </Button>
      </form>
    </div>
  );
}

function ChatRoom(props) {
  const messageRef = collection(firestore, "messages");
  console.log("entered chat room");
  console.log(props.roomKey);
  const q = query(
    messageRef,
    where("roomID", "==", props.roomKey),
    orderBy("createdAt"),
    limit(50)
  );
  const [messages, setMessages] = useState([]);
  const [video, setVideo] = useState("");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
      // snapshots.forEach((doc) => {
      //   console.log(`${doc.id} => ${doc.data().text}`);
      const unsub = onSnapshot(
        doc(firestore, "videoData", props.roomKey),
        (doc) => {
          console.log("Current data: ", doc.data());
          setPlaying(doc.data().playing);
          setVideo(doc.data().url);
        }
      );
      // });
    });
  }, []);

  //const [messages] = userCollectionData(q, { idField: "id" });

  return (
    <>
      <Header />
      <div>
        <br />
        <div className="centerButtons">
          <Button
            type="submit"
            size="large"
            variant="contained"
            color="error"
            type="submit"
            onClick={() => props.setRoomKey("")}
          >
            Exit Room
          </Button>
          <Button
            onClick={() => {
              props.setRoomKey("");
              auth.signOut();
            }}
            type="submit"
            size="large"
            variant="contained"
            color="error"
            type="submit"
          >
            Sign Out
          </Button>
        </div>

        <h1 className="roomText">
          The Secret key for this room is {props.roomKey}
        </h1>
        <div className="combined">
          <div className="player">
            <ReactPlayer url={video} playing={playing} controls={true} />
          </div>

          <div className="textMessages">
            <h1>ChatRoom</h1>
            {messages.map((msg) => (
              <ChatMessage key={msg.uid} message={msg} />
            ))}

            <SendMessage
              video={video}
              setVideo={setVideo}
              playing={playing}
              setPlaying={setPlaying}
              roomKey={props.roomKey}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;
  // console.log("does this work???");
  // console.log(uid);
  console.log("roomekey");
  console.log(props.message.roomID);
  return (
    <div>
      <div
        className={uid === auth.currentUser.uid ? "msg sent" : "msg recieved"}
      >
        <img src={photoURL} alt="new" />
        <p>{text}</p>
      </div>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    console.log(provider);
    console.log(auth);
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log("User Signed In");
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <div>
      <Header />
      <div className="getheight">
        <Button
          className="SignInButton"
          size="large"
          variant="contained"
          color="success"
          onClick={signInWithGoogle}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

function SignOut() {
  if (auth.currentUser != null) {
    return <Button onClick={() => auth.signOut()}>Sign in with Google</Button>;
  }
}
