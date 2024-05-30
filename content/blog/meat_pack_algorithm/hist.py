import pandas
import requests
from collections import Counter

urls = [
    "https://raw.githubusercontent.com/sameer/g-code/v0.4.0/tests/edge_cases.gcode",
    "https://raw.githubusercontent.com/sameer/g-code/v0.4.0/tests/vandy_commodores_logo.gcode",
    "https://raw.githubusercontent.com/sameer/g-code/v0.4.0/tests/square.gcode",
    "https://raw.githubusercontent.com/sameer/g-code/v0.4.0/tests/ncviewer_sample.gcode"
]
top = 16
data = [requests.get(u).text for u in urls]

counter = Counter()
for d in data:
    counter += Counter(d)
total = counter.total()
top_total = sum(map(lambda x: x[1], counter.most_common(top)))

df = pandas.DataFrame.from_dict(counter, orient='index').sort_values(by=[0], ascending=False)
df.index = df.index.to_series().map(lambda x: x.encode('unicode_escape').decode('utf-8') if x != ' ' else 'space')
df = df / total
df = df[:top]

df.plot(kind='bar', legend=False).get_figure().savefig('hist.png')

print(f'The top {top} characters constitute {100 * top_total/total}%')
