import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';


export interface SignupRequest {
  // Attributs de base
  email: string;
  motDePasse: string;       
  nom: string;              
  prenom: string;  
  telephone?: string;
  adresse?: string;
  sexe: string;
  ville:string
  role: string; 
  // Attributs spécifiques
  description?: string;        // Pour EMPLOYEUR
  preferences?: string;        // Pour CLIENT
  competences?: string;        // Pour FREELANCE
  experiences?: string;        // Pour FREELANCE
  portfolio?: string; 
  latitude?: number;
  longitude?: number;         // Pour FREELANCE
}

// Interface pour la requête de connexion
export interface LoginRequest {
  email: string;
  password: string;
}

// Interface pour la réponse d'authentification
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
  // Autres informations retournées par le backend
}

@Injectable({
  providedIn: 'root',
})
export class RegisterService {
  private apiUrl = 'http://localhost:8081/api/auth';

  constructor(private http: HttpClient) {}

  // Méthode d'inscription
 // Méthode d'inscription améliorée
signup(request: SignupRequest): Observable<AuthResponse> {
  console.log('Envoi de la demande d\'inscription:', request);
  
  // Vérifier que nous avons bien "password" et pas "motDePasse"
  const formattedRequest = {
    ...request,
    // S'assurer que nous utilisons le bon nom de champ
    password: request.motDePasse,
  };
  
  // Vérifier si le champ nécessaire existe
  if (!formattedRequest.password) {
    console.error('Erreur: Le mot de passe est manquant dans la requête d\'inscription');
    return throwError(() => new Error('Le mot de passe est requis pour l\'inscription'));
  }
  
  return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, formattedRequest)
    .pipe(
      tap(response => {
        console.log('Réponse d\'inscription:', response);
        // Stocker les informations d'authentification
        this.storeAuthData(response);
      }),
      catchError(error => {
        console.error('Erreur lors de l\'inscription:', error);
        return throwError(() => 
          error.error?.message || 
          error.message || 
          'Une erreur est survenue lors de l\'inscription'
        );
      })
    );
}

  // Méthode de connexion
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response: AuthResponse) => {
          // Stocker les informations d'authentification
          this.storeAuthData(response);
        })
      );
  }

  // // Méthode de déconnexion
  // logout(): void {
  //   localStorage.removeItem('auth_token');
  //   localStorage.removeItem('refresh_token');
  //   localStorage.removeItem('user_role');
  //   localStorage.removeItem('user_id');
  // }

  // Stocker les données d'authentification
  private storeAuthData(authData: AuthResponse): void {
    localStorage.setItem('auth_token', authData.accessToken);
    localStorage.setItem('refresh_token', authData.refreshToken);
    localStorage.setItem('user_role', authData.role);
    localStorage.setItem('user_id', authData.userId);
  }

  // // Vérifier si l'utilisateur est connecté
  // isLoggedIn(): boolean {
  //   return !!localStorage.getItem('auth_token');
  // }

  // // Récupérer le token d'authentification
  // getToken(): string | null {
  //   return localStorage.getItem('auth_token');
  // }

  // // Récupérer le rôle de l'utilisateur
  // getUserRole(): string | null {
  //   return localStorage.getItem('user_role');
  // }

}