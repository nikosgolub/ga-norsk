import sys,json,time
from faster_whisper import WhisperModel
m=WhisperModel(sys.argv[1],device='cpu',compute_type='int8')
A=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','audio')+'/'
for id in sys.argv[2:]:
    t=time.time()
    segs,info=m.transcribe(A+id+'.mp3',language='no',word_timestamps=True,vad_filter=False,beam_size=5)
    W=[{'w':w.word.strip(),'s':round(w.start,2),'e':round(w.end,2)} for s in segs for w in s.words]
    json.dump({'dur':info.duration,'words':W},open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'whisper-raw',id+'.json'),'w'),ensure_ascii=False)
    print(id,info.duration,len(W),round(time.time()-t,1),flush=True)
