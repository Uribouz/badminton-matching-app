import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SettingService {

  constructor(private authService: AuthService) { }

  saveForceTeamates(forceTeamates: {player1:string, player2: string}[]) {
    localStorage.setItem('force-teamates', JSON.stringify(forceTeamates))
    this.syncSettingsToSupabase();
  }
  loadForceTeamates():{player1:string, player2: string}[] {
    let forceTeamates:{player1:string, player2: string}[] = []
    let tempString = localStorage.getItem('force-teamates')
    if (!tempString) {
      return forceTeamates
    }
    forceTeamates = JSON.parse(tempString)
    return forceTeamates
  }
  saveNemesisTeamates(nemesisTeamates: {player1:string, player2: string}[]) {
    localStorage.setItem('nemesis-teamates', JSON.stringify(nemesisTeamates))
    this.syncSettingsToSupabase();
  }
  loadNemesisTeamates():{player1:string, player2: string}[] {
    let nemesisTeamates:{player1:string, player2: string}[] = []
    let tempString = localStorage.getItem('nemesis-teamates')
    if (!tempString) {
      return nemesisTeamates
    }
    nemesisTeamates = JSON.parse(tempString)
    return nemesisTeamates
  }
  addForceTeamate(newForceTeamate: {player1:string, player2: string}) {
    let currentForceTeamates = this.loadForceTeamates()
    this.saveForceTeamates([...currentForceTeamates, newForceTeamate])
    return
  }
  addNemesisTeamate(newNemesisTeamate: {player1:string, player2: string}) {
    let currentNemesisTeamates = this.loadNemesisTeamates()
    this.saveNemesisTeamates([...currentNemesisTeamates, newNemesisTeamate])
    return
  }
  deleteForceTeamate(deleteForceTeamate: {player1:string, player2: string}){
    let newForceTeamates = this.loadForceTeamates().filter(
      each => each.player1+each.player2 != deleteForceTeamate.player1 + deleteForceTeamate.player2
    )
    this.saveForceTeamates(newForceTeamates);
    return
  }
  deleteNemesisTeamate(deleteNemesisTeamate: {player1:string, player2: string}){
    let newNemesisTeamates = this.loadNemesisTeamates().filter(
      each => each.player1+each.player2 != deleteNemesisTeamate.player1 + deleteNemesisTeamate.player2
    )
    this.saveNemesisTeamates(newNemesisTeamates);
    return
  }

  async syncSettingsToSupabase() {
    const supabase = this.authService.getClient();
    const user = await this.authService.getUser();
    if (!user) {
      return;
    }

    const forceTeammates = this.loadForceTeamates();
    const nemesisTeammates = this.loadNemesisTeamates();

    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          user_id: user.id,
          force_teammates: forceTeammates,
          nemesis_teammates: nemesisTeammates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error syncing settings to Supabase:', error);
    } else {
      console.debug('Settings synced to Supabase');
    }
  }

  async loadSettingsFromSupabase() {
    const supabase = this.authService.getClient();
    const user = await this.authService.getUser();
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('settings')
      .select('force_teammates, nemesis_teammates')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading settings from Supabase:', error);
      return;
    }

    if (data) {
      localStorage.setItem('force-teamates', JSON.stringify(data['force_teammates'] ?? []));
      localStorage.setItem('nemesis-teamates', JSON.stringify(data['nemesis_teammates'] ?? []));
    }
  }
}
