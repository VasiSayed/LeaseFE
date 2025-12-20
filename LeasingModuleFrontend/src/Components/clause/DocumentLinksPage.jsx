import React, { useState } from 'react';
import { FileText, ExternalLink, Download, Trash2, Plus, Upload, Search, Filter } from 'lucide-react';

const DocumentLinksPage = () => {
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: 'Lease Agreement Template.pdf',
      type: 'PDF',
      size: '2.4 MB',
      linkedTo: 'CL001, CL004',
      uploadedBy: 'Alice Johnson',
      uploadDate: '2023-10-15',
      url: '#'
    },
    {
      id: 2,
      name: 'Insurance Certificate.pdf',
      type: 'PDF',
      size: '1.1 MB',
      linkedTo: 'CL003',
      uploadedBy: 'Bob Smith',
      uploadDate: '2023-09-20',
      url: '#'
    },
    {
      id: 3,
      name: 'Property Maintenance Guidelines.docx',
      type: 'DOCX',
      size: '856 KB',
      linkedTo: 'CL002',
      uploadedBy: 'Charlie Davis',
      uploadDate: '2023-08-30',
      url: '#'
    },
    {
      id: 4,
      name: 'Tenant Handbook.pdf',
      type: 'PDF',
      size: '3.2 MB',
      linkedTo: 'CL001, CL002, CL003',
      uploadedBy: 'Diana Prince',
      uploadDate: '2023-07-10',
      url: '#'
    }
  ]);

  const [selectedDocs, setSelectedDocs] = useState([]);

  const handleSelectDoc = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(doc => doc.id));
    }
  };

  const handleDelete = (docId) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(doc => doc.id !== docId));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Are you sure you want to delete ${selectedDocs.length} selected document(s)?`)) {
      setDocuments(documents.filter(doc => !selectedDocs.includes(doc.id)));
      setSelectedDocs([]);
    }
  };

  const getFileIcon = (type) => {
    const colors = {
      'PDF': 'bg-red-100 text-red-600',
      'DOCX': 'bg-blue-100 text-blue-600',
      'XLSX': 'bg-green-100 text-green-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Document Links</h1>
            <p className="text-sm text-gray-600 mt-1">Manage documents linked to lease clauses</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input 
                      type="checkbox" 
                      className="rounded"
                      checked={selectedDocs.length === documents.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Document Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Linked to Clauses</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Uploaded By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Upload Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => handleSelectDoc(doc.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${getFileIcon(doc.type)}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.size}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.linkedTo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.uploadedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.uploadDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="View">
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Download">
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-1 hover:bg-red-50 rounded" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Bar */}
          {selectedDocs.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-blue-50">
              <div className="text-sm text-gray-700">
                Selected {selectedDocs.length} items
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Download Selected
                </button>
                <button 
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Storage Info */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Storage Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Documents</span>
              <span className="font-medium text-gray-800">{documents.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Storage Used</span>
              <span className="font-medium text-gray-800">7.5 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '15%' }}></div>
            </div>
            <p className="text-xs text-gray-500">15% of 50 MB used</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentLinksPage;
