import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;
  isSignUp = false;

  constructor(private authService: AuthService, private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';
    this.loading = true;

    try {
      const { error } = this.isSignUp
        ? await this.authService.signUp(this.email, this.password)
        : await this.authService.signIn(this.email, this.password);

      if (error) {
        this.errorMessage = error.message;
      } else if (this.isSignUp) {
        this.errorMessage = 'Check your email to confirm your account.';
      } else {
        this.router.navigate(['/player-list']);
      }
    } catch (err) {
      this.errorMessage = 'An unexpected error occurred.';
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
  }

  loginAsGuest() {
    this.router.navigate(['/guest']);
  }
}
