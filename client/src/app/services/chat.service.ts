import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr'; 
import {ChatMessage, OpenTicket} from "../models/ChatDTO";

@Injectable({
  providedIn: 'root'
})

export class ChatService {

  constructor() {}

  // BOTH USER and TECH --------------------------------------------------------
  private _hubConnection!: signalR.HubConnection;

  // holds message conversations
  public messages: ChatMessage[] = []

  // holds the chatRoomId & initial message for TECH ONLY
  public openTickets: OpenTicket[] = [];

  // how messages are exchanged between tech & user once in a private room
  public sendChat(chat: ChatMessage, ticketId: number) {
    // temporary measure until we have seperate profiles

    // ticketId should be equivalent to the privateRoomKey of a user account
    if (this.privateRoomKey == 0) {
      this._hubConnection.invoke("SendChat", chat, ticketId);
    } else {
      this._hubConnection.invoke("SendChat", chat, this.privateRoomKey);
    }
  }

  // USER ONLY -----------------------------------------------------------------
  // establishes their private room to be connected to
  private privateRoomKey: number = 0;

  // for USERS only; puts user in a private connection room & informs tech support
  public initiateTicket(initialMessage: ChatMessage) {
    console.log("initializing ticket")
    
    // need to generate a privateRoomKey. should do it via the customer_id in production, but will generate a random one for testing
    this.privateRoomKey = Math.floor(Math.random() * 10000);

    this._hubConnection.invoke("OpenTicket", this.privateRoomKey, initialMessage)
  }

  // TECH ONLY -----------------------------------------------------------------
  // holds all user tickets
  public userTickets: number[] = [];
  public currentActiveTicket: number = 0;

  // enables tech support to be notified when a new ticket is made.
  public joinTechSupport()
  {
    console.log("joining tech support");
    this._hubConnection.invoke("JoinSupportChat");
  }  

  // on click of a ticket, matches a tech support with a customer
  public initializeSupportConnection(roomKey: number, initialMessage: ChatMessage) {
    this.currentActiveTicket = roomKey;
    this._hubConnection.invoke("TechSupportJoinsConversation", roomKey);

    this.messages.push(initialMessage)
    console.log("MESSAGES", this.messages)
  }

  // connection ----------------------------------------------------------------
  // establishes connection to websocket / hub, and establishes event listeners
  // the events that should be listened to will depend on USER vs. TECH
  // can check for user status & create different connection methods for each
  public connect() {
    this._hubConnection = new signalR.HubConnectionBuilder()
    // withUrl requires hub connection url
      .withUrl("https://localhost:7249/chatsocket", {
        // cannot access the connectionId in the backend if skipNegation: true
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets
      })
      .build()

    // BOTH: listening for messages in private chat room
    this._hubConnection.on("messaging", (message: ChatMessage) => {
      // can render response messages from here
      this.messages.push(message);
      console.log("all messages", this.messages)

      //activateNewMessage
    });

    // BOTH: tech joins private room & notifies both parties
    this._hubConnection.on("conversationStarted", (message: ChatMessage) => {
      console.log("conversation started:", message);

      // should announce to user that tech support has joined the chat session
      const joinAnnouncement: ChatMessage =  {
        user: "Announcement",
        message: "Tech support has joined the chat"
      };

      this.messages.push(joinAnnouncement);
    })

    // TECH: listening for when a user opens a ticket, need the privateRoomKey id that will be attached
    this._hubConnection.on("OpenTicket", (privateRoomKey: number, initialMessage: ChatMessage) => {
      console.log("OpenTicket", privateRoomKey)

      this.userTickets.push(privateRoomKey);

      // testing an openTicket for TECH support to use
      // GOAL: not only does clicking the ticket link chat room, but also show initial message
      const newTicket: OpenTicket = {
        chatRoomId: privateRoomKey.toString(),
        initialMessage: initialMessage
      }
      this.openTickets.push(newTicket);

      // include the user's message in the return value to append to tech support's chat
    })

    // BOTH: starts listening for hub coorespondance
    this._hubConnection.start()
      .then(() => console.log("connection started"))
      .catch((err) => console.log("error receiving connection", err))
  }

  
}