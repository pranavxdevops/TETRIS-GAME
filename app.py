from flask import Flask, render_template

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # For local dev only. In Docker use gunicorn (see Dockerfile).
    app.run(host='0.0.0.0', port=8000, debug=True)