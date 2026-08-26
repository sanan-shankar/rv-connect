import Image from "next/image";
// lucide, not the phosphor SSR entry: this file is pulled into the client
// bundle by the admin queue, and nothing else in the app imports phosphor from
// a "use client" tree.
import { ShieldCheck } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatTimeAgo } from "@/lib/utils";

/**
 * One conversation between a member and the admins, rendered the same way on
 * the member's own page and inside the admin queue, so both sides read the
 * thread identically.
 *
 * Rows are all left-aligned rather than chat-app left/right: this is closer to
 * a letter than to a messaging app, and it keeps long paragraphs on one
 * measure. The two sides are told apart by the mark and the surface under
 * them. Lines the app wrote itself (authorId null, e.g. "You reported a post
 * by X") sit between the rows as a plain note, so nobody mistakes them for an
 * admin having already answered.
 */

export interface ConversationMessage {
  id: string;
  body: string;
  imageUrl: string | null;
  fromAdmin: boolean;
  createdAt: string;
  author: { id: string; name: string; photoUrl: string | null; birdOverride: string | null } | null;
}

/** The canopy circle that stands in for "the admins" beside their replies. */
export function AdminMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-canopy text-white"
      style={{ width: size, height: size }}
    >
      <ShieldCheck size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}

function SystemNote({ message }: { message: ConversationMessage }) {
  return (
    <li className="flex justify-center px-1">
      <p className="max-w-[36rem] whitespace-pre-wrap rounded-[var(--radius)] bg-mist/70 px-4 py-3 text-center text-[13.5px] leading-[1.65] text-muted-foreground">
        {message.body}
      </p>
    </li>
  );
}

function MessageRow({
  message,
  viewerIsAuthor,
}: {
  message: ConversationMessage;
  viewerIsAuthor: boolean;
}) {
  if (!message.author && message.fromAdmin) return <SystemNote message={message} />;

  const name = message.fromAdmin
    ? "Rishi Valley admins"
    : viewerIsAuthor
      ? "You"
      : (message.author?.name ?? "Someone");

  return (
    <li className="flex gap-3">
      {message.fromAdmin ? (
        <AdminMark />
      ) : (
        <BirdAvatar
          user={{
            id: message.author?.id,
            name: message.author?.name,
            photoUrl: message.author?.photoUrl,
            birdOverride: message.author?.birdOverride,
          }}
          size={36}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13.5px] font-semibold text-foreground">{name}</span>
          <span className="text-[12px] text-muted-foreground">
            {formatTimeAgo(new Date(message.createdAt))}
          </span>
        </div>
        <div
          className={`mt-1.5 rounded-[var(--radius)] px-3.5 py-3 ${
            message.fromAdmin ? "bg-canopy/[0.07]" : "bg-mist/70"
          }`}
        >
          <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">
            {message.body}
          </p>
          {message.imageUrl && (
            <a
              href={message.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-fit overflow-hidden rounded-lg border border-border transition-[border-color,transform] duration-150 hover:border-canopy/40 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Image
                src={message.imageUrl}
                alt="Attached screenshot"
                width={420}
                height={280}
                className="h-auto max-h-72 w-auto max-w-full object-contain"
                unoptimized
              />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function Conversation({
  messages,
  viewerId,
}: {
  messages: ConversationMessage[];
  viewerId: string;
}) {
  return (
    <ul className="flex flex-col gap-5">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} viewerIsAuthor={m.author?.id === viewerId} />
      ))}
    </ul>
  );
}
