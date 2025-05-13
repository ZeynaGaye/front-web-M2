export const environment = {
    production: true,
    // Remplacez ceci par l'URL réelle de votre API en production
    // Par exemple : https://api.beautyhub.com ou https://beautyhub.com/api
    apiUrl: 'http://localhost:8081/api',
    keycloak: {
      url: 'http://localhost:8080/auth', // À remplacer par l'URL Keycloak de production
      realm: 'BeautyHub',
      clientId: 'Beautyhub',
     // clientSecret: 'UNt3ujscPggFKEaVVlnV84ja9rPRORE8'
    }
  };