
// Configuration pour le développement local
export const environment = {
    production: false,
    apiUrl: 'http://localhost:8081/api',  // URL de mon backend
    keycloak: {
    url: 'http://localhost:8080', // URL de Keycloak
      realm: 'BeautyHub',
      clientId: 'Beautyhub-front',
    
    }
  };