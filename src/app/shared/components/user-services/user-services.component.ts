// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-user-services',
//   imports: [],
//   templateUrl: './user-services.component.html',
//   styleUrl: './user-services.component.scss'
// })
// export class UserServicesComponent implements OnInit {
//   services: ServiceSalonDTO[] = [];
//   userRole: string = '';

//   constructor(private userService: UserService, private authService: AuthService) {}

//   ngOnInit(): void {
//     this.userRole = this.authService.getUserRole(); // Récupère le rôle de l'utilisateur
//     this.loadServices();
//   }

//   loadServices(): void {
//     this.userService.getServices().subscribe(
//       (data) => this.services = data,
//       (error) => console.error('Error loading services', error)
//     );
//   }
// }
