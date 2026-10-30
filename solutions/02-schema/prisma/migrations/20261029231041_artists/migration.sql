-- CreateTable
CREATE TABLE "artists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_artists" (
    "event_id" INTEGER NOT NULL,
    "artist_id" INTEGER NOT NULL,

    CONSTRAINT "event_artists_pkey" PRIMARY KEY ("event_id","artist_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artists_name_key" ON "artists"("name");

-- CreateIndex
CREATE INDEX "event_artists_artist_id_idx" ON "event_artists"("artist_id");

-- AddForeignKey
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
