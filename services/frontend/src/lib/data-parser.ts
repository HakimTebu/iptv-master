import fs from 'fs';
import path from 'path';

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  epgId: string;
  group: string;
  category: string;
  isHD: boolean;
  isGeoBlocked: boolean;
  isYoutube: boolean;
}

export interface ChannelGroup {
  name: string;
  slug: string;
  channels: Channel[];
}

export function parseMarkdownLists(listsDir: string): ChannelGroup[] {
  const files = fs.readdirSync(listsDir).filter(file => file.endsWith('.md'));
  const groups: ChannelGroup[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(listsDir, file), 'utf-8');
    const groupName = content.match(/<h1>(.*?)<\/h1>/)?.[1] || file.replace('.md', '');
    const slug = file.replace('.md', '');
    const channels: Channel[] = [];

    let currentCategory = 'General';
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect Category
      const h2Match = line.match(/<h2>(.*?)<\/h2>/);
      if (h2Match) {
        currentCategory = h2Match[1];
        continue;
      }

      // Detect Table Row
      if (line.startsWith('|') && !line.includes('| #') && !line.includes('|:---:')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 4) {
          const nameWithFlags = cells[1];
          const linkCell = cells[2];
          const logoCell = cells[3];
          const epgId = cells[4] || '';

          const urlMatch = linkCell.match(/\[>\]\((.*?)\)/);
          const logoMatch = logoCell.match(/src="(.*?)"/);

          if (urlMatch) {
            const url = urlMatch[1];
            const logo = logoMatch ? logoMatch[1] : '';
            
            const isHD = nameWithFlags.includes('Ⓢ');
            const isGeoBlocked = nameWithFlags.includes('Ⓖ');
            const isYoutube = nameWithFlags.includes('Ⓨ');
            
            // Clean name from tags/flags
            const name = nameWithFlags.replace(/[ⓈⒼⓎ]/g, '').trim();

            channels.push({
              id: `${slug}-${channels.length}`,
              name,
              url,
              logo,
              epgId,
              group: groupName,
              category: currentCategory,
              isHD,
              isGeoBlocked,
              isYoutube,
            });
          }
        }
      }
    }

    if (channels.length > 0) {
      groups.push({
        name: groupName,
        slug,
        channels,
      });
    }
  }

  return groups;
}
