import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { Contact } from '../model/contact.model';

@Injectable()
export class ContactService {

    private firestore = inject(Firestore);

    createContact(contact: Contact): Promise<any> {
        return addDoc(collection(this.firestore, 'contacts'), contact as any);
    }
}
