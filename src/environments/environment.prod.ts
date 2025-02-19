let environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'AIzaSyD5hd4ptb2ger4nQtmIGvO71z7AJ9cDwEA',
    authDomain: 'emmanuelkorircv.firebaseapp.com',
    databaseURL: 'https://emmanuelkorircv-default-rtdb.firebaseio.com',
    projectId: 'emmanuelkorircv',
    storageBucket: 'emmanuelkorircv.appspot.com',
    messagingSenderId: '676940554194',
    appId: '1:676940554194:web:bca93d11d7d700ccffb20b',
    measurementId: 'G-S5609XRE46'
  },
  baseUrl: '' ,
  author:'Emmanuel1017'
};

environment.baseUrl = environment.production  
  ? 'https://emmanuel1017.github.io/Angular-Resume-Portfolio'  
  : 'http://localhost:4200';

export { environment };
