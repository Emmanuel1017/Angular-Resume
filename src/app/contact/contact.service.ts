import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Contact } from '../model/contact.model';

@Injectable()
export class ContactService {

    private firestore = inject(Firestore);

    createContact(contact: Contact): Promise<any> {
        return addDoc(collection(this.firestore, 'contacts'), {
            ...contact,
            timestamp: serverTimestamp(), // Firestore Timestamp — used for ordering in Flutter
            read:      false,             // unread by default — picked up by Flutter badge stream
            source:    'web'              // distinguishes web submissions from Flutter guest app
        });
    }
}
