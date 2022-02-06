import React, { Component } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import {
	Bubble,
	GiftedChat,
	SystemMessage,
	Day,
	InputToolbar,
} from 'react-native-gifted-chat';

import * as firebase from 'firebase';
import 'firebase/firestore';
// import AsynceStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo
import NetInfo from '@react-native-community/netinfo';

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
	constructor() {
		super();
		this.state = {
			messages: [],
			uid: 0,
			user: {
				_id: '',
				name: '',
				avatar: '',
			},
			isConnected: false,
		};

		//initializing firebase
		if (!firebase.apps.length) {
			firebase.initializeApp(firebaseConfig);
		}
		// reference to the Firestore messages collection
		this.referenceChatMessages = firebase.firestore().collection('messages');
		this.refMsgsUser = null;
	}

	onCollectionUpdate = QuerySnapshot => {
		const messages = [];
		// go through each document
		QuerySnapshot.forEach(doc => {
			// get the queryDocumentSnapshot's data
			let data = doc.data();
			messages.push({
				_id: data._id,
				text: data.text,
				createdAt: data.createdAt.toDate(),
				user: {
					_id: data.user._id,
					name: data.user.name,
					avatar: data.user.avatar,
				},
			});
		});
		this.setState({
			messages: messages,
		});
	};

	// get messages from AsyncStorage
	getMessages = async () => {
		let messages = '';
		try {
			messages = (await AsyncStorage.getItem('messages')) || [];
			this.setState({
				messages: JSON.parse(messages),
			});
		} catch (error) {
			console.log(error.message);
		}
	};

	// save messages on the asyncStorage
	saveMessage = async () => {
		try {
			await AsyncStorage.setItem(
				'messages',
				JSON.stringify(this.state.messages)
			);
		} catch (error) {
			console.log(error.message);
		}
	};

	// delete message from asyncStorage
	deleteMessages = async () => {
		try {
			await AsyncStorage.removeItem('messages');
			this.setState({
				messages: [],
			});
		} catch (error) {
			console.log(error.message);
		}
	};

	componentDidMount() {
		let { name } = this.props.route.params;
		this.props.navigation.setOptions({ title: name });

		// check the user connection status, online?
		NetInfo.fetch().then(connection => {
			if (connection.isConnected) {
				this.setState({ isConnected: true });
				console.log('online');
				// listens for updates in the collection
				this.unsubscribe = this.referenceChatMessages
					.orderBy('createdAt', 'desc')
					.onSnapshot(this.onCollectionUpdate);

				// listen to authentication events
				this.authUnsubscribe = firebase
					.auth()
					.onAuthStateChanged(async user => {
						if (!user) {
							return await firebase.auth().signInAnonymously();
						}

						// update user state with currently active data
						this.setState({
							uid: user.uid,
							messages: [],
							user: {
								_id: user.uid,
								name: name,
								avatar: 'https://placeimg.com/140/140/any',
							},
						});

						//referencing messages of current user
						this.refMsgsUser = firebase
							.firestore()
							.collection('messages')
							.where('uid', '==', this.state.uid);
					});
				// save messages locally to AsyncStorage
				this.saveMessages();
			} else {
				// the user is offline
				this.setState({ isConnected: false });
				console.log('offline');
				this.getMessages();
			}
		});
	}

	componentWillUnmount() {
		// stop listening to authentication
		this.authUnsubscribe();
		// stop listening for changes
		this.unsubscribe();
	}

	addMessage() {
		const message = this.state.messages[0];
		// add a new message to the collection
		this.referenceChatMessages.add({
			_id: message._id,
			text: message.text || '',
			createdAt: message.createdAt,
			user: this.state.user,
		});
	}

	onSend(messages = []) {
		this.setState(
			previousState => ({
				messages: GiftedChat.append(previousState.messages, messages),
			}),
			() => {
				this.saveMessage();
				this.addMessage();
			}
		);
	}

	renderBubble(props) {
		return (
			<Bubble
				{...props}
				wrapperStyle={{
					right: {
						backgroundColor: '#dbb35a',
					},
					left: {
						backgroundColor: 'white',
					},
				}}
			/>
		);
	}

	renderSystemMessage(props) {
		return <SystemMessage {...props} textStyle={{ color: '#736357' }} />;
	}

	renderDay(props) {
		return (
			<Day
				{...props}
				textStyle={{
					color: '#fff',
					backgroundColor: '#9e938c',
					borderRadius: 15,
					padding: 10,
				}}
			/>
		);
	}

	renderInputToolbar(props) {
		if (this.state.isConnected == false) {
		} else {
			return <InputToolbar {...props} />;
		}
	}

	render() {
		let name = this.props.route.params.name;
		this.props.navigation.setOptions({ title: name });

		let bgColor = this.props.route.params.bgColor;

		return (
			<View style={styles.container}>
				<View
					style={{
						backgroundColor: bgColor,
						width: '100%',
						height: '100%',
					}}
				>
					<GiftedChat
						style={styles.giftedChat}
						renderBubble={this.renderBubble.bind(this)}
						renderSystemMessage={this.renderSystemMessage}
						renderDay={this.renderDay}
						renderInputToolbar={this.renderInputToolbar.bind(this)}
						messages={this.state.messages}
						onSend={messages => this.onSend(messages)}
						user={{
							_id: this.state.user._id,
							name: this.state.name,
							avatar: this.state.user.avatar,
						}}
					/>
					{Platform.OS === 'android' ? (
						<KeyboardAvoidingView behavior="height" />
					) : null}
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
	giftedChat: {
		color: '#000',
	},
});