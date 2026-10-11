import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { binderSummary, binderTree } from '@/components/hero/files';
import { site } from '@/site.config';

export const dynamic = 'force-static';
const size = { width: 1200, height: 630 };

// next build runs from apps/web; geist's exports map doesn't expose its font files.
const fontDir = join(process.cwd(), 'node_modules/geist/dist/fonts');

/** Static Open Graph image, exported as out/og.png (a file route keeps the .png extension). */
export async function GET() {
  const [sans, sansSemi, mono] = await Promise.all([
    readFile(join(fontDir, 'geist-sans/Geist-Regular.ttf')),
    readFile(join(fontDir, 'geist-sans/Geist-SemiBold.ttf')),
    readFile(join(fontDir, 'geist-mono/GeistMono-Regular.ttf')),
  ]);

  const grid =
    'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#000',
        color: '#ededed',
        fontFamily: 'Geist',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: grid,
          backgroundSize: '48px 48px',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 560,
          top: 60,
          width: 640,
          height: 520,
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.08), transparent)',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 0 64px 72px',
          width: 560,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#ededed',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 5,
              paddingLeft: 9,
            }}
          >
            <div style={{ width: 18, height: 4, borderRadius: 2, background: '#000' }} />
            <div style={{ width: 13, height: 4, borderRadius: 2, background: '#000' }} />
            <div style={{ width: 7, height: 4, borderRadius: 2, background: '#000' }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>
            {site.productName}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 86, fontWeight: 600, letterSpacing: -3.8, lineHeight: 1.02 }}>
            The shoebox,
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 600,
              letterSpacing: -3.8,
              lineHeight: 1.02,
              backgroundImage: 'linear-gradient(180deg, #ffffff, #8a8a8a)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            sorted.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 25,
              color: '#a1a1a1',
              lineHeight: 1.4,
              maxWidth: 470,
            }}
          >
            Client docs in, binder ready. Everything runs on your computer.
          </div>
        </div>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', paddingRight: 64, position: 'relative' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 520,
            borderRadius: 16,
            border: '1px solid #333',
            background: '#111',
            boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '20px 24px',
              borderBottom: '1px solid #1f1f1f',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#ededed',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 5,
                paddingLeft: 10,
              }}
            >
              <div style={{ width: 20, height: 4, borderRadius: 2, background: '#111' }} />
              <div style={{ width: 14, height: 4, borderRadius: 2, background: '#111' }} />
              <div style={{ width: 8, height: 4, borderRadius: 2, background: '#111' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>Jane Sample – 2026 Binder.pdf</div>
              <div
                style={{ fontSize: 16, fontFamily: 'Geist Mono', color: '#a1a1a1', marginTop: 4 }}
              >
                {binderSummary}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 24px 16px' }}>
            {binderTree.map((node) => (
              <div
                key={node.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '9px 0',
                  borderBottom: '1px solid #1a1a1a',
                  fontSize: 19,
                }}
              >
                <div style={{ display: 'flex' }}>{node.label}</div>
                <div style={{ display: 'flex', fontFamily: 'Geist Mono', color: '#7d7d7d' }}>
                  {node.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Geist', data: sans, weight: 400 },
        { name: 'Geist', data: sansSemi, weight: 600 },
        { name: 'Geist Mono', data: mono, weight: 400 },
      ],
    },
  );
}
