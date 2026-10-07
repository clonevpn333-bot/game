import type { Game } from '../Game';
import type { Chapter } from '../Chapter';
import { Prologue, TitleReel } from './Prologue';
import { CityWalks } from './CityWalks';
import { AntleredRide } from './AntleredRide';
import { Embers } from './Embers';
import { IronPilgrimage } from './IronPilgrimage';
import { CarillonClimb } from './CarillonClimb';
import { TheFall } from './TheFall';
import { LastProcession } from './LastProcession';

export interface ChapterCtor {
  new (g: Game): Chapter;
  meta: { num: string; title: string; subtitle: string };
}

/** The film, in order. */
export const CHAPTERS: ChapterCtor[] = [Prologue, CityWalks, AntleredRide, Embers, IronPilgrimage, CarillonClimb, TheFall, LastProcession];
export { TitleReel };
