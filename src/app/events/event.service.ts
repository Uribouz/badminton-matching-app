import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  constructor(private authService: AuthService) { }

  async ensureEventExists(eventKey: string): Promise<void> {
    const supabase = this.authService.getClient();
    const { error } = await supabase
      .from('events')
      .upsert({ event_key: eventKey }, { onConflict: 'event_key' });
    if (error) {
      console.error('Error ensuring event exists:', error);
    }
  }
}
