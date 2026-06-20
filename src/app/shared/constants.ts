export class Constants {
  static eventIdPrefix: string = "root-event";
  static APIURL: string = "https://badminton-matching-service.onrender.com"

  static todayEventKey(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${Constants.eventIdPrefix}:${yyyy}-${mm}-${dd}`;
  }
}