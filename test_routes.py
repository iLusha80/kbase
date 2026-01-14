from app import app

def test_route(path):
    with app.test_client() as client:
        response = client.get(path)
        print(f"Path: {path} -> Status: {response.status_code}")

if __name__ == "__main__":
    print("Testing routes...")
    test_route('/')
    test_route('/dashboard')
    test_route('/reports/weekly')
    test_route('/api/reports/weekly')
    test_route('/contacts/1')
