export interface Entity {
  offset: number;
  length: number;
  type: 'mention' | 'url'
}
