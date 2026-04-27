from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# This stores logs in memory for the current session
logs = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/log', methods=['POST'])
def receive_log():
    data = request.get_json()
    if data and 'message' in data:
        # Add the new log to our list
        logs.append(data['message'])
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "No data received"}), 400

@app.route('/get_logs')
def get_logs():
    # Return all logs as JSON for the frontend to display
    return jsonify(logs)

if __name__ == '__main__':
    # Set host to '0.0.0.0' to make it accessible on your network
    app.run(host='0.0.0.0', port=5000, debug=True)