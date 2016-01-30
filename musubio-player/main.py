from flask import Flask, render_template, Response
from flask.ext.triangle import Triangle

# Flask triangle install issue/workaround
# https://github.com/GoogleCloudPlatform/appengine-flask-skeleton/issues/1

app = Flask(__name__, template_folder='site/templates', static_folder='site/static', static_url_path='')

Triangle(app)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run()