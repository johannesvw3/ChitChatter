import React, { Component } from 'react';
import { 
  GiftedChat,  
  InputToolbar, 
  Bubble } from 'react-native-gifted-chat';

import { 
  View, 
  Text,  
  StyleSheet, 
  Platform, 
  KeyboardAvoidingView, 
  LogBox} from 'react-native';

import firebase from "firebase";
import "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from '@react-native-community/netinfo';

import MapView from 'react-native-maps';
import CustomActions from './CustomActions';


// web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyAlTjFLTyHbfzhNQbyLJyVmX9zMAzq4WfM",
	authDomain: "chitchatter-f7117.firebaseapp.com",
	projectId: "chitchatter-f7117",
	storageBucket: "chitchatter-f7117.appspot.com",
	messagingSenderId: "878165850777",
	appId: "1:878165850777:web:c309397b99a603c4b71608",
	measurementId: "G-E171PWC7H6"
  };


export default class Chat extends Component {

	constructor(props){
	  super();
	  this.state ={
		messages: [],
		uid: 0,
		user: {
		  _id: "",
		  name: "",
		  avatar: "",
		},
		isConnected: false,
		image: null,
		location: null,
	  };
  
	  //initializing firebase
	  if (!firebase.apps.length){
		firebase.initializeApp(firebaseConfig);
	  }
	  // reference to the Firestore message collection
	  this.referenceChatMessages = firebase.firestore().collection("messages");
	  this.refMsgsUser = null;
  
	   // To remove warning message in the console 
	   LogBox.ignoreLogs([
		'Setting a timer',
		'Warning: ...',
		'undefined',
		'Animated.event now requires a second argument for options',
	  ]);
  
	}
	
  
	componentDidMount() {
	  // Set the page title once Chat is loaded
	  let { name } = this.props.route.params
	  // Adds the name to top of screen
	  this.props.navigation.setOptions({ title: name })
  
	  // checks if user is online or offline
	  NetInfo.fetch().then(connection => {
		//when user is online...
		if (connection.isConnected) {
		  this.setState({ isConnected: true });
		  console.log('online');
  
		   // listens for updates in the collection
		   this.unsubscribe = this.referenceChatMessages
		   .orderBy("createdAt", "desc")
		   .onSnapshot(this.onCollectionUpdate)
  
		  // user authentication performed first
		  this.authUnsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
			if (!user) {
			  return await firebase.auth().signInAnonymously();
			}
			//update user state with currently active user data
			this.setState({
			  uid: user.uid,
			  messages: [],
			  user: {
				_id: user.uid,
				name: name,
				avatar: "https://placeimg.com/140/140/any",
			  },
			});
			//referencing messages of current user
			this.refMsgsUser = firebase
			  .firestore()
			  .collection("messages")
			  .where("uid", "==", this.state.uid);
		  });
		   //saving messages locally to asyncStorage
		   this.saveMessages();
		} else {
		  // when user is offline
		  console.log('offline');
		  this.setState({ isConnected: false });
		  //get messages from asyncStorage
		  this.getMessages();
		}
	  });
  
	}
  
  
	// when updated set the messages state with the current data 
	onCollectionUpdate = (querySnapshot) => { 
	  const messages = [];
	  // go through each document
	  querySnapshot.forEach((doc) => {
		// get the QueryDocumentSnapshot's data
		let data = doc.data();
		messages.push({
		  _id: data._id,
		  text: data.text,
		  createdAt: data.createdAt.toDate(),
		  user: {
			_id: data.user._id,
			name: data.user.name,
			avatar: data.user.avatar
		  },
		  image: data.image || null,
		  location: data.location || null,
		});
	  });
	  this.setState({
		messages: messages
	  });
	};
  
	componentWillUnmount() {
	  //unsubscribe from collection updates
	  this.authUnsubscribe();
	  this.unsubscribe();
  
	}
  
	// to read a messgae from async storage
	async getMessages() {
	  let messages = '';
	  try {
		messages = await AsyncStorage.getItem('messages') || [];
		this.setState({
		  messages: JSON.parse(messages)
		});
	  } catch (error) {
		console.log(error.message);
	  }
	};
  
	// to save a messgae on async storage
	async saveMessages() {
	  try {
		await AsyncStorage.setItem(
		  'messages', 
		  JSON.stringify(this.state.messages)
		);
	  } catch (error) {
	  console.log(error.message);
	  }
	}
  
	// to delete a message from async storage
	async deleteMessages() {
	  try {
		await AsyncStorage.removeItem('messages');
		this.setState({
		  messages: []
		})
	  } catch (error) {
		console.log(error.message);
	  }
	}
  
	// Add messages to database
	addMessages() { 
	  const message = this.state.messages[0];
	  // add a new messages to the collection
	  this.referenceChatMessages.add({
		_id: message._id,
		text: message.text || "",
		createdAt: message.createdAt,
		user: this.state.user,
		image: message.image || "",
		location: message.location || null,
	  });
	}
  
  
	// calback function for when user sends a message
	onSend(messages = []) {
	  this.setState(previousState => ({
		messages: GiftedChat.append(previousState.messages, messages),
	  }), () => {
		this.addMessages();
		this.saveMessages();
	  })
	}
  
	// Customize the chat bubble background color
	renderBubble(props) { 
	  return (
		<Bubble {...props} 
		wrapperStyle={{ 
		  right: {backgroundColor: '#59c3c3'},
		 }}
		/>
	  )
	}
  
	// renders the chat input field toolbar only when user is online
	renderInputToolbar(props) {
	  if (this.state.isConnected == false) {
	  } else {
		return(
		  <InputToolbar {...props}/>
		);
	  }
	}
  
	// Returns a mapview when user adds a location to current message
	renderCustomView(props) {
	  const { currentMessage } = props;
	  if (currentMessage.location) {
		return (
		  <MapView
			style={{ width: 150, height: 100, borderRadius: 13, margin: 3 }}
			region={{
			  latitude: currentMessage.location.latitude,
			  longitude: currentMessage.location.longitude,
			  latitudeDelta: 0.0922,
			  longitudeDelta: 0.0421,
			}}
		  />
		);
	  }
	  return null;
	}
  
	// action button to access communication features via an action sheet
	renderCustomActions(props) {
	  return <CustomActions {...props} />;
	}
  
	render() {
	  // Set the background color selected from start screen
	  const { bgColor } = this.props.route.params;
	  return (
	   
		<View style={{
		  flex: 1,
		  alignItems:'center', 
		  justifyContent:'center', 
		  backgroundColor: bgColor ? bgColor : "#fff",}}>
		  <View style={styles.giftedChat}>
			 <GiftedChat
				renderBubble={this.renderBubble.bind(this)}
				renderInputToolbar={this.renderInputToolbar.bind(this)}
				messages={this.state.messages}
				user={this.state.user}
				onSend={messages => this.onSend(messages)}
				renderActions={this.renderCustomActions}
				renderCustomView={this.renderCustomView}
				user={{
				  _id: this.state.user._id,
				  name: this.state.name,
				  avatar: this.state.user.avatar
				}}
			  />
			  { Platform.OS === 'android' ? (
				<KeyboardAvoidingView behavior="height" />
				) : null}
		  </View>
		</View>
	  )
	}
  }
  
  const styles = StyleSheet.create({
	container: {
	  flex: 1,
	  alignItems:'center', 
	  justifyContent:'center'
	},
	giftedChat: {
	  flex: 1,
	  width: "88%",
	  paddingBottom: 10,
	  justifyContent: "center",
	  borderRadius: 5,
	},
  
  });