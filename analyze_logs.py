import json
from collections import Counter

def main():
    try:
        with open('logs.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logs = data if isinstance(data, list) else data.get('logs', [])
        today_logs = [log for log in logs if log.get('timestamp', '').startswith('2026-02-23')]
        
        print(f'Total Today: {len(today_logs)}')
        
        urls = Counter()
        types = Counter()
        
        for log in today_logs:
            types[log.get('type')] += 1
            
            url = log.get('url')
            if not url and 'context' in log:
                url = log['context'].get('url')
            
            if url:
                base = url.split('?')[0].replace('https://', '').replace('http://', '').replace('secure.helpscout.net', 'HelpScout').replace('maestro.smyleteam.com', 'Maestro CRM')
                urls[base] += 1
        
        print('\n--- Top URL Contexts ---')
        for k, v in urls.most_common(20):
            print(f'{v}: {k}')
            
        print('\n--- Event Types ---')
        for k, v in types.most_common(15):
            print(f'{v}: {k}')
            
        with open('today_recent.json', 'w', encoding='utf-8') as out:
            json.dump(today_logs[-200:], out, indent=2)

    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    main()
