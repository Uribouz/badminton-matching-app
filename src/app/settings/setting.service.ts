import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingService {

  constructor() { }
  saveForceTeamates(forceTeamates: {player1:string, player2: string}[]) {
    localStorage.setItem('force-teamates', JSON.stringify(forceTeamates))
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
      each => each.player1 != deleteForceTeamate.player1 && each.player2 != deleteForceTeamate.player2
    )
    this.saveForceTeamates(newForceTeamates);
    return
  }
  deleteNemesisTeamate(deleteNemesisTeamate: {player1:string, player2: string}){
    let newNemesisTeamates = this.loadNemesisTeamates().filter(
      each => each.player1 != deleteNemesisTeamate.player1 && each.player2 != deleteNemesisTeamate.player2
    )
    this.saveNemesisTeamates(newNemesisTeamates);
    return 
  }
}
