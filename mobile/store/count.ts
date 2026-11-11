// Prints character counts of each ``` block in listing.md, with the heading it belongs to.
const md = await Bun.file(`${import.meta.dir}/listing.md`).text();
let heading = '', label = '';
for (const part of md.split(/```/).map((s, i) => [s, i] as const)) {
  const [s, i] = part;
  if (i % 2 === 0) {
    heading = s.match(/^## (.*)$/gm)?.pop()?.slice(3) ?? heading;
    label = s.trim().split('\n').pop() ?? '';
  } else {
    const text = s.replace(/^\n/, '').replace(/\n$/, '');
    console.log(`${heading} | ${label}: ${[...text].length}`);
  }
}
