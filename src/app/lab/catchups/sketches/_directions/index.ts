/* One line per direction. The order here is the order of the tabs, which is
   the order S3 would look at them (directions.md, 2.5): a nudge, not a
   ranking he must honour. 08 sits beside 04 as its second execution. */

import type { SketchDirection } from "../_types";
import { actionButton } from "./action-button";
import { calendar } from "./calendar";
import { shelf } from "./shelf";
import { frontDoor } from "./front-door";
import { conversation } from "./conversation";
import { room } from "./room";
import { paged } from "./paged";
import { wholeApp } from "./whole-app";
import { transcript } from "./transcript";
import { letter } from "./letter";

export const DIRECTIONS: SketchDirection[] = [
  actionButton,
  calendar,
  shelf,
  frontDoor,
  conversation,
  room,
  paged,
  wholeApp,
  transcript,
  letter,
];
