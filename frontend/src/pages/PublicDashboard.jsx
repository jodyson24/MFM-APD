import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Countdown from '../components/common/countdown';

const TreeNode = ({ node }) => (
  <div className="ml-4 border-l-2 border-primaryBg border-opacity-30 pl-4">
    <div className="my-2">
      <span className="font-semibold text-primaryBg">{node.name}</span>
      <span className="text-xs text-gray-500 ml-2">{node.type.replace('_', ' ')}</span>
      {node.programmes.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.programmes.map((p) => (
            <li key={p.id} className="text-sm text-gray-700">
              {p.title} — <span className="text-gray-500">{new Date(p.scheduledDate).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
    {node.children && node.children.map((c) => <TreeNode key={c.id} node={c} />)}
  </div>
);

const PublicDashboard = () => {
  const [data, setData] = useState(null);
  const [tree, setTree] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/public/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load the public dashboard.'));
    api
      .get('/public/tree')
      .then((res) => setTree(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bodyBg">
      <header className="bg-primary-gradient px-6 py-6 text-center">
        <h1 className="text-3xl font-bold text-white">MFM Activities Dashboard</h1>
        <p className="text-white text-opacity-80 mt-1 text-sm">Public programme calendar — dates &amp; names only</p>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        {data?.nextPresentationDate && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Next Bi-Annual Presentation{data.nextPresentationLabel ? ` (${data.nextPresentationLabel})` : ''}
            </h2>
            <Countdown targetDate={data.nextPresentationDate} />
            <p className="text-sm text-gray-500 mt-2">
              {new Date(data.nextPresentationDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold text-primaryBg mb-3">Mega Regional Programmes</h2>
          {data?.programmes?.map((mr) => (
            <div key={mr.id} className="bg-white rounded-lg shadow p-4 mb-3">
              <h3 className="font-semibold text-gray-800">{mr.name}</h3>
              {mr.programmes.length === 0 ? (
                <p className="text-sm text-gray-500 mt-1">No programmes scheduled yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {mr.programmes.map((p) => (
                    <li key={p.id} className="text-sm text-gray-700">
                      {p.title} — <span className="text-gray-500">{new Date(p.scheduledDate).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {tree.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-primaryBg mb-3">Full Calendar (Regions → Zones → Branches)</h2>
            <div className="bg-white rounded-lg shadow p-4">
              {tree.map((n) => (
                <TreeNode key={n.id} node={n} />
              ))}
            </div>
          </section>
        )}

        <div className="text-center">
          <Link to="/login" className="text-primaryBg text-sm hover:underline">
            Admin Sign In
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PublicDashboard;
