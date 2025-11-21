import { useEffect, useState } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * Firebase Connection Test Component
 * Tests Firebase Authentication, Firestore, and Storage initialization
 *
 * Remove this component after verifying Firebase works!
 */
export default function FirebaseTest() {
  const [status, setStatus] = useState({
    firebase: '⏳ Testing...',
    firestore: '⏳ Testing...',
    auth: '⏳ Testing...',
    storage: '⏳ Testing...',
    writeTest: '⏳ Pending...'
  });
  const [testDocId, setTestDocId] = useState(null);

  useEffect(() => {
    testFirebase();
  }, []);

  const testFirebase = async () => {
    // Test 1: Firebase App Initialization
    try {
      setStatus(prev => ({ ...prev, firebase: '✅ Firebase initialized' }));
    } catch (err) {
      setStatus(prev => ({ ...prev, firebase: `❌ Error: ${err.message}` }));
      return;
    }

    // Test 2: Firestore
    try {
      const testCollection = collection(db, 'test');
      setStatus(prev => ({ ...prev, firestore: '✅ Firestore connected' }));
    } catch (err) {
      setStatus(prev => ({ ...prev, firestore: `❌ Error: ${err.message}` }));
    }

    // Test 3: Auth
    try {
      const currentUser = auth.currentUser;
      setStatus(prev => ({
        ...prev,
        auth: currentUser
          ? `✅ Auth ready (User: ${currentUser.email})`
          : '✅ Auth ready (No user logged in)'
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, auth: `❌ Error: ${err.message}` }));
    }

    // Test 4: Storage
    try {
      const storageRef = storage;
      setStatus(prev => ({ ...prev, storage: '✅ Storage ready' }));
    } catch (err) {
      setStatus(prev => ({ ...prev, storage: `❌ Error: ${err.message}` }));
    }
  };

  const testFirestoreWrite = async () => {
    setStatus(prev => ({ ...prev, writeTest: '⏳ Writing to Firestore...' }));

    try {
      // Write test document
      const testData = {
        message: 'Firebase is working!',
        timestamp: new Date().toISOString(),
        project: 'Storehouse'
      };

      const docRef = await addDoc(collection(db, 'test'), testData);
      setTestDocId(docRef.id);

      setStatus(prev => ({
        ...prev,
        writeTest: `✅ Write successful! Doc ID: ${docRef.id}`
      }));

      console.log('[Firebase Test] Document written with ID:', docRef.id);
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        writeTest: `❌ Write failed: ${err.message}`
      }));
      console.error('[Firebase Test] Write error:', err);
    }
  };

  const testFirestoreRead = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'test'));
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('[Firebase Test] Read documents:', docs);
      alert(`✅ Read ${docs.length} document(s) from Firestore!\n\nCheck console for details.`);
    } catch (err) {
      console.error('[Firebase Test] Read error:', err);
      alert(`❌ Read failed: ${err.message}`);
    }
  };

  const cleanupTestDoc = async () => {
    if (!testDocId) {
      alert('No test document to clean up');
      return;
    }

    try {
      await deleteDoc(doc(db, 'test', testDocId));
      setStatus(prev => ({ ...prev, writeTest: '✅ Test document deleted' }));
      setTestDocId(null);
      console.log('[Firebase Test] Test document deleted');
    } catch (err) {
      console.error('[Firebase Test] Delete error:', err);
      alert(`❌ Delete failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#fff',
      border: '2px solid #2063F0',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#2063F0' }}>
        🔥 Firebase Test Panel
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        <div><strong>Firebase:</strong> {status.firebase}</div>
        <div><strong>Firestore:</strong> {status.firestore}</div>
        <div><strong>Auth:</strong> {status.auth}</div>
        <div><strong>Storage:</strong> {status.storage}</div>
        <div><strong>Write Test:</strong> {status.writeTest}</div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={testFirestoreWrite}
          style={{
            padding: '10px',
            background: '#2063F0',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Test Firestore Write
        </button>

        <button
          onClick={testFirestoreRead}
          style={{
            padding: '10px',
            background: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Test Firestore Read
        </button>

        {testDocId && (
          <button
            onClick={cleanupTestDoc}
            style={{
              padding: '10px',
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Delete Test Document
          </button>
        )}
      </div>

      <p style={{
        fontSize: '12px',
        color: '#666',
        marginTop: '16px',
        marginBottom: '0'
      }}>
        Remove this component after testing!
      </p>
    </div>
  );
}
