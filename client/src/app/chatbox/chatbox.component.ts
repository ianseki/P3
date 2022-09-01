import { Component, OnInit, ChangeDetectorRef} from '@angular/core';
import { FormControl, NgForm } from '@angular/forms';
import {ChatService} from "../services/chat.service";
import { ChatMessage, OpenTicket } from '../models/ChatDTO';

@Component({
  selector: 'app-chatbox',
  templateUrl: './chatbox.component.html',
  styleUrls: ['./chatbox.component.css'],
  providers: [ChatService]
})

export class ChatboxComponent implements OnInit {
  testUsernames : string[] = [ "Jonathan De_La_Cruz", "Kadin Campbell", "Annie Arayon-Calosa", "Hau Nguyen", "German Diaz",
  "Brandon Figueredo", "Alejandro Hernandez", "James Beitz", "Abanob Sadek", "Ian Seki", "Iqbal Ahmed", "Brandon Sassano",
  "Daniel Beidelschies", "Derick Xie", "Eunice Decena", "Aurel Npounengnong", "Samuel Jackson", "Ellery De_Jesus", "Rogers Ssozi",
  "Lance Gong", "Arthur Gao", "Jared Green", "Jake Nguyen", "Joseph Boye", "Onandi Stewart", "Andrew Grozdanov", "Richard Hawkins" ];
  user : string = ''; //Client username goes here
  // the messages from each client will be fetched via service calls, and retrieved from chatService.messages
  messages : ChatMessage[] = this.chatService.messages;
  // grab tickets from chat.services
  tickets = this.chatService.openTickets;
  // changed on ticket selection, routes message to correct user for TECH ONLY
  currentActiveTicket: number = this.chatService.currentActiveTicket;
  sendContents : string = ''; //Don't touch this
  minimized : boolean = true;
  ticketMinimized : boolean = true;
  isSupport : boolean = false;

  constructor(public chatService: ChatService, private cdref: ChangeDetectorRef) { }
  
  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }
  ngOnInit(): void {
    // TESTING ONLY; setting username (will be grabbed here from auth once implemented)
    this.user = this.testUsernames[Math.floor(Math.random() * this.testUsernames.length)];
    console.log(this.user);

    // connect to webSocket
    this.chatService.connect()

    // fetch all tickets for TECH ONLY
    this.fetchAllTickets();
  }

  messageInput = new FormControl('');

  // for tracking how many messages have been sent in a short time period, to help prevent bombarding our server
  spamFilterTracker = {
    initialTime: Date.now(),
    messageCount: 0,
    isSpam: false
  }
  
  submitMessage(form: NgForm){
    const ticketId: number = this.chatService.currentActiveTicket;
    const now = new Date();
    // let newMessage: ChatMessage = {
    //   ticketId: this.user,
    //   user: this.user,
    //   message: this.sendContents,
    //   date: now
    // }
    if(this.sendContents == null)
      return;
    console.log(this.user + ": " + this.sendContents);

    const isSpam: boolean = this.checkIfSpam(ticketId);

    if (!isSpam) {
      let newMessage: ChatMessage = {
        ticketId: this.user,
        user: this.user,
        message: this.sendContents,
        date: now
      }
      if(this.sendContents == null)
        return;
      console.log(this.user + ": " + this.sendContents);
  
      // for first message, automatically submit a ticket
      if (this.messages.length === 0) {
        this.initiateTicket(newMessage)
      }
      this.chatService.sendChat(newMessage, ticketId)
      form.reset();
    }
  }

  checkIfSpam(ticketId: number): boolean {
    // if it has been at least 5 seconds since initial message, reset counter
    let isSpam: boolean = false;

    if (Math.abs(this.spamFilterTracker.initialTime - Date.now()) > 5000) {
      this.spamFilterTracker.initialTime = Date.now();
      this.spamFilterTracker.messageCount = 0;
      this.spamFilterTracker.isSpam = false;
    }

    // if a user has sent 6+ messages within 5000 miliseconds
    const now = new Date();
    if (this.spamFilterTracker.messageCount > 5) {
      const announcement = {
        ticketId: this.user,
        user: "Announcement",
        message: "Please wait a moment before sending another message",
        date: now
      }

      this.chatService.sendChat(announcement, ticketId);
      console.log("Please wait a moment before trying to send another message")
      
      isSpam = true;
    }
    
    this.spamFilterTracker.messageCount++;
    return isSpam;
  }

  // creates a new ticket for USER only
  public initiateTicket(initialMessage: ChatMessage) {
    this.chatService.initiateTicket(initialMessage);
  }

  // should be called in init for TECH only; connects them to techSupport channel
  public joinTechSupport() {
    this.chatService.joinTechSupport();
    this.isSupport = true;
  }

  // should be called by TECH only on click of a ticket to join a particular chat channel
  // will need to save the privateRoomKey variable saved in the web socket to the ticket, and transfer it on click
  public initializeSupportConnection(event: any) {
    const privateRoomKey: string = event.target.id
    // should contain the initial message that will be pushed into TECH messages
    const now = new Date();
    const initialMessage: ChatMessage = {
      ticketId: event.target.dataset.ticketId,
      user: event.target.dataset.user,
      message: event.target.innerText,
      date: now
    };

    // connect tech support to user chat room
    this.chatService.initializeSupportConnection(parseInt(privateRoomKey), initialMessage);
    // grab the user's ticket's previous message
    this.fetchUserTicket(event.target.dataset.user);
  }

  //closes ticket
  closeTicket(chatRoom: OpenTicket, user: string) {
    if(chatRoom.open)
      this.chatService.closeTicket(chatRoom.chatRoomId, user);
  }

  //Button click function to minimize chat
  public minimizerClick(){
    if(this.minimized)
      this.minimized = false;
    else
      this.minimized = true;
  }

  //Button click function to minimize support tickets
  public ticketMinimizerClick(){
    if(this.ticketMinimized)
      this.ticketMinimized = false;
    else
      this.ticketMinimized = true;
  }

  // will need to update how we get all tickets, as below & the previous method above (getting them from the service variable) collide
  public fetchAllTickets() {
    this.chatService.fetchAllTickets()
    // moved the below functionality all to service, since we currently have the tickets in this component linked up with openTickets in the service
    // this may or may not be the best approach

      // .subscribe((result) => {
      //   console.log("fetch all tickets result", result);
      //   const receivedTickets: OpenTicket[] = result.body as OpenTicket[];
      //   // allTickets to be displayed to TECH user; rendered in the HTML
      //   this.tickets = receivedTickets;
      // })
  }

  public fetchUserTicket(username: string) {
    this.chatService.fetchUserTicket(username)
    // moved the below functionality to service, for the same reason as fetchAllTickets
      // .subscribe((result) => {
      //   console.log("fetch user ticket result", result);
      //   const userTicket: OpenTicket = result.body as OpenTicket;

      //   // new ChatMessage[] to replace the currently set one
      //   const ticketMessages: ChatMessage[] = [];
      //   // create a new initialTicket to push to ticketMessages; need to typecast OpenTicket -> ChatMessages
      //   const initialTicketMessage: ChatMessage = {
      //     ticketId: userTicket.chatRoomId,
      //     user: userTicket.user,
      //     message: userTicket.message,
      //     date: new Date()
      //   }
      //   ticketMessages.push(initialTicketMessage);

      //   // overwrite currently set messages with the initial message from the newly selected ticket
      //   this.messages = ticketMessages;
      // })
  }
}
