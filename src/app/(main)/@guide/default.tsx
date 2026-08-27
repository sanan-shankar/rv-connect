/**
 * The @guide slot's resting state: nothing.
 *
 * Every parallel route needs one of these. Without it a hard load of any
 * (main) page has no value for this slot and Next 404s the whole page, which
 * is a spectacular way to take down the entire signed-in site.
 */
export default function GuideSlotDefault() {
  return null;
}
