import React, { useEffect, useState } from "react";
import {gapi} from 'gapi-script';
import {Table, Button, Modal, Form, Input} from "antd";
import axios from "axios";
import "./GoogleDrive.css";

const CLIENT_ID = "574939406601-23mji49d87k08f1rl8s76261f3dca0sl.apps.googleusercontent.com";
const API_KEY = 'AIzaSyBubiCBIvRD1vq1kc8VWWp7kGt8srSaVqA';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive';
const BASE_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"

export default function GoogleDrive({allSigned, setSign, setInfo, fileToUpload, setFileToUpload, toUpload, setToUpload, fileToGet, setFileToGet, setFileToSend, searchQuery, canService}) {
    const [accessToken, setAccessToken] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
    const [uploadFileModalVisible, setUploadFileModalVisible] = useState(false);
    const [newNameModalVisible, setNewNameModalVisible] = useState(false);
    const [newFolderForm] = Form.useForm();
    const [newNameForm] = Form.useForm();
    const [uploadFileForm] = Form.useForm();
    const [loaded, setLoaded] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [newNameRecord, setNewNameRecord] = useState(null);
    const [sizeInfo, setSizeInfo] = useState(null);
    const [searchFiles, setSearchFiles] = useState([]);

    useEffect(() => {
        gapi.load("client:auth2", initClient);
        if(isSignedIn) {
            setAccessToken(gapi.auth.getToken().access_token);
            setSign(true);
            getFolders();
            getFiles();
        }
        else{
            setSign(false);
        }
    }, [isSignedIn,currentFolder]);
    useEffect(() => {
        if(accessToken)
            handleDriveSizeInfo();

    },[accessToken,files,folders])
    useEffect(() => {
        if (searchQuery)
            handleFileSearch();
    },[searchQuery])

    useEffect(() => {
        if(fileToUpload && toUpload){
            handleGlobalUpload();
        }
    },[fileToUpload,toUpload])
    useEffect(() => {
        if(fileToGet){
            handleGetFromYandex();
        }
    },[fileToGet])
    const handleGlobalUpload = async () => {
        try {
            let folderId;
            if(currentFolder){
                folderId = currentFolder.key;
            }
            else{
                folderId = "root";
            }
            let file = fileToUpload;
            const url = `${UPLOAD_URL}?uploadType=multipart`;
            const headers = {
                'Content-Type': 'multipart/related',
                'Authorization': `Bearer ${accessToken}`
            };
            const meta = {
                name: file.name,
                mimeType: file.type,
                parents: [folderId]
            };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
            formData.append('file', file);
            await axios.post(url,
                formData,
                {headers}
            )
                .then(res=>{
                    setFiles([
                        ...files,
                        {
                            key: res.data.id,
                            name: file.name,
                            createdTime: new Date().toString(),
                            size: file.size,
                            type: "file"
                        },
                    ]);
                })
                .catch(e=>console.log(e));
            setFileToUpload(null);
            setToUpload(false);
        } catch (error) {
            console.error(error);
        }
    }

    const initClient = async () => {
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        });
        setLoaded(true)
    };
    const handleSignIn = () => {
        gapi.auth2.getAuthInstance().signIn()
            .then(() => {
                setIsSignedIn(true);
                setAccessToken(gapi.auth.getToken().access_token);
                setSign(true);
            })
            .catch(() => setIsSignedIn(false))
    }
    const handleSignOut = () => {
        gapi.auth2.getAuthInstance().signOut()
            .then(() => {
                setIsSignedIn(false)
                setAccessToken(null);
                setSign(false);
            })
    };
    const getFolders = async () => {
        try{
            let folderId;
            if(currentFolder)
                folderId = currentFolder.key;
            else
                folderId = 'root';
            const response = await axios.get(`${BASE_URL}`,{
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    orderBy: 'createdTime',
                    q: `'${folderId}' in parents and trashed=false and mimeType="application/vnd.google-apps.folder"`,
                    fields: 'nextPageToken, files(id, name, createdTime)'
                }
            })
            const foldersList = response.data.files;
            setFolders(
                foldersList.map((folder) => ({
                    key: folder.id,
                    name: folder.name,
                    createdTime: folder.createdTime,
                    size: '-',
                    type: "folder",
                }))
            );
        } catch (e) {
            console.error(e);
        }
    }
    const getFiles = async () => {
        try {
            let folderId;
            if(currentFolder)
                folderId = currentFolder.key;
            else
                folderId = 'root';
            const response = await axios.get(`${BASE_URL}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    orderBy: 'createdTime',
                    q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
                    fields: 'files(id, name, createdTime, size)'
                }
            })
            const filesList = response.data.files;
            setFiles(
                filesList.map((file) => ({
                    key: file.id,
                    name: file.name,
                    size: file.size,
                    createdTime: file.createdTime,
                    type: "file",
                }))
            );
        }catch (e) {
            console.error(e);
        }
    };
    const handleNavigateClick = (folder) => {
        setCurrentFolder(folder);
    };
    const handleBackClick = () => {
        setCurrentFolder(null);
    };
    const docsFormat = (params) => {
        let format;
        let mime = params.data.mimeType;
        if(mime.match(/.*\.document$/)){
            format = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            mime='docx';
        }
        else if(mime.match(/.*\.spreadsheet$/)){
            format = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mime='xlsx';
        }
        else if(mime.match(/.*\.presentation$/)){
            format = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            mime='pptx';
        }
        else{
            format = 'application/pdf';
            mime='pdf';
        }
        let result = {
            format: format,
            mime: mime
        }
        return result;
    }
    const handleDownloadClick = async (record) => {
        try {
            let params;
            await axios.get(`${BASE_URL}/${record.key}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    fields: 'id, name, mimeType, createdTime, size, webContentLink'
                }
            }).then(async res => {
                params = res
            })
            if(params.data.webContentLink){
                await axios.get(
                    `${BASE_URL}/${params.data.id}?alt=media`,
                    {
                        responseType: 'blob',
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                ).then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', params.data.name);
                    document.body.appendChild(link);
                    link.click();
                }).catch(e => {
                    console.error(e);
                });
            }
            else{
                const format = docsFormat(params).format;
                await axios.get(
                    `${BASE_URL}/${params.data.id}/export?mimeType=${format}`,
                    {
                        responseType: 'blob',
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                ).then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${params.data.name}.${docsFormat(params).mime}`);
                    document.body.appendChild(link);
                    link.click();
                }).catch(e => {
                    console.error(e);
                });
            }
        }catch(e) {
            console.error(e)
        }
    }
    const handleSendToYandex = async (record) => {
      try {
          let params;
          await axios.get(`${BASE_URL}/${record.key}`, {
              headers: {
                  Authorization: `Bearer ${accessToken}`
              },
              params: {
                  fields: 'id, name, mimeType, createdTime, size, webContentLink'
              }
          }).then(async res => {
              params = res
          })
          if(params.data.webContentLink){
              await axios.get(
                  `${BASE_URL}/${params.data.id}?alt=media`,
                  {
                      responseType: 'blob',
                      headers: {
                          Authorization: `Bearer ${accessToken}`
                      }
                  }
              ).then(res => {
                  const fileData = new Blob([res.data], {type: res.headers['content-type']})
                  const sendFile = {
                      data: fileData,
                      name: record.name
                  }
                  setFileToSend(sendFile);
              }).catch(e => {
                  console.error(e);
              });
          }
          else{
              const format = docsFormat(params).format;
              await axios.get(
                  `${BASE_URL}/${params.data.id}/export?mimeType=${format}`,
                  {
                      responseType: 'blob',
                      headers: {
                          Authorization: `Bearer ${accessToken}`
                      }
                  }
              ).then(res => {
                  const fileData = new Blob([res.data], {type: res.headers['content-type']})
                  const sendFile = {
                      data: fileData,
                      name: record.name
                  }
                  setFileToSend(sendFile);
              }).catch(e => {
                  console.error(e);
              });
          }
      }catch (e) {
          console.error(e);
      }
    }
    const handleNewFolderClick = () => {
        setNewFolderModalVisible(true);
    };
    const handleNewFolderOkClick = async () => {
        try {
            let folderId;
            if(currentFolder){
                folderId = currentFolder.key;
            }
            else{
                folderId = "root";
            }
            const postData = {
                name: newFolderForm.getFieldValue("name"),
                mimeType: "application/vnd.google-apps.folder",
                parents: folderId
            }
            const headers = {
                Authorization: `Bearer ${accessToken}`
            }
            const response = await axios.post(`${BASE_URL}`,postData,{
                headers,
                params: {
                    fields: 'id',
                }
            })
            setFolders([
                ...folders,
                {
                    key: response.data.id,
                    name: newFolderForm.getFieldValue("name"),
                    createdTime: new Date().toString(),
                    size: '-',
                    type: "folder",
                },
            ]);
            newFolderForm.resetFields();
            setNewFolderModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };
    const handleNewFolderCancelClick = () => {
        newFolderForm.resetFields();
        setNewFolderModalVisible(false);
    };
    const handleGetFromYandex = async () => {
        try{
            let folderId;
            if(currentFolder){
                folderId = currentFolder.key;
            }
            else{
                folderId = "root";
            }
            const file = fileToGet;
            const url = `${UPLOAD_URL}?uploadType=multipart`;
            const headers = {
                'Content-Type': 'multipart/related',
                'Authorization': `Bearer ${accessToken}`
            };
            const meta = {
                name: file.name,
                mimeType: file.data.type,
                parents: [folderId]
            };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
            formData.append('file', new Blob([file.data]));
            await axios.post(url, formData,{headers}).then(res=>{
                setFiles([
                    ...files,
                    {
                        key: res.data.id,
                        name: file.name,
                        createdTime: new Date().toString(),
                        size: file.data.size,
                        type: "file"
                    },
                ]);
                setFileToGet(null);
            }).catch(e=>console.log(e));

        }catch (e) {
            console.error(e);
        }
    }
    const handleUploadFileClick = () => {
        setUploadFileModalVisible(true);
    };

    const handleUploadingFileChange = (event) => {
        setUploadingFile(event.target.files[0]);
    }

    const handleUploadFileOkClick = async () => {
        try {
            let folderId;
            if(currentFolder){
                folderId = currentFolder.key;
            }
            else{
                folderId = "root";
            }
            let file = uploadingFile;
            const url = `${UPLOAD_URL}?uploadType=multipart`;
            const headers = {
                'Content-Type': 'multipart/related',
                'Authorization': `Bearer ${accessToken}`
            };
            const meta = {
                name: file.name,
                mimeType: file.type,
                parents: [folderId]
            };
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
            formData.append('file', file);
            await axios.post(url,
                formData,
                {headers}
            )
                .then(res=>{
                    setFiles([
                        ...files,
                        {
                            key: res.data.id,
                            name: file.name,
                            createdTime: new Date().toString(),
                            size: file.size,
                            type: "file"
                        },
                    ]);
                })
                .catch(e=>console.log(e));
            uploadFileForm.resetFields();
            setUploadFileModalVisible(false);
            setUploadingFile(null);
        } catch (error) {
            console.error(error);
        }
    };
    const handleUploadFileCancelClick = () => {
        uploadFileForm.resetFields();
        setUploadFileModalVisible(false);
        setUploadingFile(null);
    };

    const handleRenameClick = (record) => {
        setNewNameRecord(record);
        setNewNameModalVisible(true);
    };
    const handleRenameOkClick = async () => {
        try {
            let newName = newNameForm.getFieldValue('Name');
            const record = newNameRecord;
            await axios.patch(
                `${BASE_URL}/${record.key}`,
                { name: newName },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            if (record.type === "folder") {
                setFolders(
                    folders.map((folder) =>
                        folder.key === record.key ? { ...folder, name: newName } : folder
                    )
                );
            } else {
                setFiles(
                    files.map((file) => (file.key === record.key ? { ...file, name: newName } : file))
                );
            }
            newNameForm.resetFields();
            setNewNameRecord(null);
            setNewNameModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    }
    const handleRenameCancelClick = () => {
      newNameForm.resetFields();
      setNewNameRecord(null);
      setNewNameModalVisible(false);
    }
    const handleDeleteClick = async (record) => {
        try {
            await axios.patch(
                `${BASE_URL}/${record.key}`,
                { trashed: true },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            if (record.type === "folder") {
                setFolders(folders.filter((folder) => folder.key !== record.key));
            } else {
                setFiles(files.filter((file) => file.key !== record.key));
            }
        } catch (error) {
            console.error(error);
        }
    };
    const handleDriveSizeInfo = async () => {
        await axios.get(`https://www.googleapis.com/drive/v3/about?fields=storageQuota`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }).then(res => {
            setSizeInfo(res.data.storageQuota);
            setInfo(res.data.storageQuota);
        });

    }
    const handleFileSearch = async () => {
        try {
            let filesSearch;
            await axios.get(`${BASE_URL}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    orderBy: 'createdTime',
                    q: `'me' in owners and trashed=false and mimeType!="application/vnd.google-apps.folder"`,
                    fields: 'files(id, name, createdTime, size)'
                }
            }).then(res => {
                const searchName = searchQuery.toLowerCase();
                filesSearch = res.data.files.filter(file => file.name.toLowerCase().includes(searchName));
            }).catch(e => console.error(e))
            filesSearch = filesSearch.map(res => ({
                key: res.id,
                name: res.name,
                size: res.size,
                createdTime: res.createdTime,
                type: "file",
            }))

            setSearchFiles([
                ...filesSearch
            ])
        }catch (e) {
            console.error(e);
        }
    }
    const sizeRender = (size) => {
        const sizeUnits = ['KB','MB','GB'];
        let i = -1;
        do{
            size = size / 1024;
            i++;
        }while(size > 1024);
        return Math.max(size,0.1).toFixed(1)+''+sizeUnits[i];
    }
    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            width: 300,
            key: "name",
            render: (text, record) =>
                record.type === "folder" ? (
                    <Button className={"link-btn"} type="link" onClick={() => handleNavigateClick(record)}>{text}</Button>
                ) : (text)
        },
        {
            title: "Created Date",
            dataIndex: "createdTime",
            key: "createdTime",
            render: time => new Date(time).toLocaleString()
        },
        {
            title: "Size",
            dataIndex: "size",
            key: "size",
            render: (text, record) => record.type !== 'folder' ? (sizeRender(text)) : (text)
        },
        {
            title: "Actions",
            dataIndex: "",
            key: "actions",
            render: (text, record) => (
                <div>
                    {record.type !== 'folder'? (<Button onClick={() => handleDownloadClick(record)}>Download</Button>) : (<></>)}
                    <Button onClick={() => handleRenameClick(record)}>Rename</Button>
                    <Button onClick={() => handleDeleteClick(record)}>Delete</Button>
                    {allSigned && record.type !== 'folder' && canService &&
                        <div>
                            <Button onClick={() => handleSendToYandex(record)}>Copy to Yandex</Button>
                        </div>
                    }
                </div>
            ),
        },
    ];
    return (
        <div>
            {loaded ? (
                <>
                    {!isSignedIn ? (
                        <Button onClick={handleSignIn}>Sign in with Google</Button>
                    ) : (
                        <>
                            <h2 className={"headers-position"}>{currentFolder ? currentFolder.name : "Google Drive"}</h2>
                            {currentFolder && (
                                <>
                                    <Button onClick={handleBackClick}>Back</Button>
                                </>
                            )}
                            <Button onClick={handleNewFolderClick}>New Folder</Button>
                            <Button onClick={handleUploadFileClick}>Upload File</Button>
                            <Modal
                                open={newFolderModalVisible}
                                onOk={handleNewFolderOkClick}
                                onCancel={handleNewFolderCancelClick}
                                title="New folder">
                                <Form form={newFolderForm}>
                                    <Form.Item label="Name" name="name" rules={[{ required: true, message: "Please input folder name" }]}>
                                        <Input />
                                    </Form.Item>
                                </Form>
                            </Modal>
                            <Modal
                                open={uploadFileModalVisible}
                                onOk={handleUploadFileOkClick}
                                onCancel={handleUploadFileCancelClick}
                                title="Upload file">
                                <Form form={uploadFileForm}>
                                    <Form.Item label="File" name="file" rules={[{ required: true, message: "Please select file" }]}>
                                        <Input type="file" onChange={handleUploadingFileChange} />
                                    </Form.Item>
                                </Form>
                            </Modal>
                            <Modal
                                open={newNameModalVisible}
                                onOk={handleRenameOkClick}
                                onCancel={handleRenameCancelClick}
                                title="New name">
                                <Form form={newNameForm}>
                                    <Form.Item label="Name" name="Name" rules={[{ required: true, message: "Please select new name" }]}>
                                        <Input />
                                    </Form.Item>
                                </Form>
                            </Modal>
                            {searchQuery!=='' ? (<Table dataSource={searchFiles} columns={columns}/>) : (<Table dataSource={[...folders,...files]} columns={columns}/>)}
                            <Button onClick={handleSignOut}>Sign out</Button>
                        </>
                    )}
                </>
            ):(<></>)}
        </div>
    );
}