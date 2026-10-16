import sys, json, re, hashlib, os
from docx import Document
from docx.oxml.ns import qn

SRC, OUT_JSON, OUT_IMG = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT_IMG, exist_ok=True)
LAT = {'А': 'A', 'Б': 'B', 'В': 'C', 'С': 'C', 'Г': 'D', 'Д': 'D'}
OPT_RE = re.compile(r'^\s*([A-DА-ДСВ])\s*[\.\)]\s*(.*)$', re.S)

def para_info(p, doc):
    text_parts, hl = [], False
    for r in p._p.iter(qn('w:r')):
        t = ''.join(x.text or '' for x in r.iter(qn('w:t')))
        text_parts.append(t)
        rpr = r.find(qn('w:rPr'))
        if t.strip() and rpr is not None and rpr.find(qn('w:highlight')) is not None:
            hl = True
    text = ''.join(text_parts).strip()
    ppr = p._p.find(qn('w:pPr'))
    num = ppr is not None and ppr.find(qn('w:numPr')) is not None
    imgs = []
    for blip in p._p.iter(qn('a:blip')):
        rid = blip.get(qn('r:embed'))
        if rid:
            imgs.append(doc.part.related_parts[rid])
    return text, hl, num, imgs

def main():
    doc = Document(SRC)
    base = os.path.splitext(os.path.basename(SRC))[0].split('_')[-1]
    questions, cur = [], None
    def new():
        return {'stem': '', 'options': [], 'explanation': '', 'images': []}
    def flush():
        nonlocal cur
        if cur and cur['stem'].strip() and cur['options']:
            questions.append(cur)
        cur = None
    for p in doc.paragraphs:
        text, hl, num, imgs = para_info(p, doc)
        mq = re.match(r'^вопрос\s*(\d+)?(\s*из\s*\d+)?\s*\.?\s*', text.lower())
        if mq and (mq.end() == len(text) or mq.group(1)):
            if cur and cur['options']:
                flush()
            if cur is None:
                cur = new()
            text = text[mq.end():].strip()
            if not text:
                continue
        if cur is None:
            cur = new()
        for part in imgs:
            ext = os.path.splitext(str(part.partname))[1]
            fn = hashlib.sha256(part.blob).hexdigest()[:16] + ext
            open(os.path.join(OUT_IMG, fn), 'wb').write(part.blob)
            cur['images'].append(fn)
        if not text or text.lower() in ('ящик с инструментами',) or re.match(r'^ответ\s*finalize', text.lower()):
            continue
        text = text.replace('参考', 'ориентир')
        m = OPT_RE.match(text)
        first_opt = m and not cur['options'] and cur['stem'] and m.group(1) in 'AА' and len(text) < 700
        if num or first_opt or (m and cur['options'] and len(cur['options']) < 6):
            # If a new question started without a "Вопрос" marker: options already complete and stem text appeared since
            if m:
                letter, body = LAT.get(m.group(1), m.group(1)), m.group(2).strip()
            else:
                letter, body = 'ABCDEF'[len(cur['options'])], text
            if letter not in 'ABCDEF' or any(o['label'] == letter for o in cur['options']):
                letter = 'ABCDEF'[len(cur['options'])]
            cur['options'].append({'label': letter, 'text': body, 'correct': hl})
        elif cur['options']:
            low = text.lower()
            if re.match(r'^(объяснение|пояснение|правильный ответ|ответ|explanation)\b', low):
                text = re.sub(r'^(объяснение|пояснение|правильный ответ|ответ|explanation)\s*[:：\-–]?\s*', '', text, flags=re.I)
                cur['explanation'] = (cur['explanation'] + '\n' + text).strip()
            elif cur['explanation']:
                cur['explanation'] = (cur['explanation'] + '\n' + text).strip()
            else:
                # no explanation; a new question began without a marker
                flush(); cur = new(); cur['stem'] = text
        else:
            cur['stem'] = (cur['stem'] + '\n' + text).strip()
    flush()
    for q in questions:
        q['source'] = base
    json.dump(questions, open(OUT_JSON, 'w'), ensure_ascii=False, indent=1)
    nc = sum(1 for q in questions if not any(o['correct'] for o in q['options']))
    print(base, len(questions), 'questions;', nc, 'without correct;', sum(len(q['images']) for q in questions), 'images;',
          sum(1 for q in questions if q['explanation']), 'with explanation')

main()
