import {useEffect,useState} from "react";
import {Button, Modal, Form, Input, Radio} from "antd";
import './App.css';
import GoogleDrive from "./Google/GoogleDrive";
import YandexDisk from "./Yandex/YandexDisk";

export default function App() {
  const [googleSigned, setGoogleSigned] = useState(false);
  const [yandexSigned, setYandexSigned] = useState(false);
  const [allSigned, setAllSigned] = useState(false);
  const [uploadSelectModalVisible, setUploadSelectModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [yandexInfo, setYandexInfo] = useState(null);
  const [googleInfo, setGoogleInfo] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [uploadSelectForm] = Form.useForm();
  const [serviceToUpload, setServiceToUpload] = useState(null);
  const [toYandex, setToYandex] = useState(false);
  const [toGoogle, setToGoogle] = useState(false);
  const [fileToGoogle, setFileToGoogle] = useState(null);
  const [fileToYandex, setFileToYandex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [yandexEnoughSpace, setYandexEnoughSpace] = useState(true);
  const [googleEnoughSpace, setGoogleEnoughSpace] = useState(true);
  const [recommendations, setRecommendations] = useState("");
  useEffect(() => {
    if(googleSigned && yandexSigned){
      setAllSigned(true);
    }
    else{
      setAllSigned(false);
    }
  },[googleSigned, yandexSigned]);
  useEffect(() => {
    if(allSigned){
      handleRecommendations();
    }
  },[yandexInfo, googleInfo])
  const handleSelectFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setFileSize(event.target.files[0].size)
    handleRecommendations();
  }
  const handleServiceSelectChange = (e) =>{
    setServiceToUpload(e.target.value);
  }
  const handleSelectClick = () => {
    setUploadSelectModalVisible(true);
  };
  const handleUploadSelectOkClick = () => {
    if(!(!yandexEnoughSpace && !googleEnoughSpace)){
      if(serviceToUpload === "yandex"){
        setToYandex(true);
        setToGoogle(false);
      }
      else{
        setToGoogle(true);
        setToYandex(false);
      }
    }
    else{
      setToYandex(false);
      setToGoogle(false);
    }
    setServiceToUpload("");
    uploadSelectForm.resetFields();
    setUploadSelectModalVisible(false);
  }
  const handleUploadSelectCancelClick = () => {
    setServiceToUpload("");
    uploadSelectForm.resetFields();
    setUploadSelectModalVisible(false);
    setSelectedFile(null);
    setToYandex(false);
    setToGoogle(false);
  }
  const handleRecommendations = () => {
    let google = googleEnoughSpace;
    let yandex = yandexEnoughSpace;
    if(googleInfo.limit-googleInfo.usage-fileSize<102400){
      setGoogleEnoughSpace(false);
      google = false;
    }
    else{
      setGoogleEnoughSpace(true);
      google = true;
    }
    if(yandexInfo.total_space-yandexInfo.used_space-fileSize<102400){
      setYandexEnoughSpace(false);
      yandex = false;
    }
    else{
      setYandexEnoughSpace(true);
      yandex = true;
    }
    if(yandex && google){
      if(googleInfo.limit-googleInfo.usage-fileSize > yandexInfo.total_space-yandexInfo.used_space-fileSize){
        setRecommendations("Recommended: Google Drive.");
      }
      else{
        setRecommendations("Recommended: Яндекс.Диск.");
      }
    }
    else if (!yandex && !google){
      setRecommendations("Not enough space in both services. File will not uploaded.");
    }
    else if(!yandex){
      setRecommendations("Only Google Drive has enough space.");
    }
    else if(!google){
      setRecommendations("Only Яндекс.Диск has enough space.");
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
  return(
      <>
        {!allSigned &&
            <>
              <h2>You need to log in to both services</h2>
            </>
        }
        {allSigned &&
            <>
              <Input.Search
                  placeholder="Search files and folders"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
              />
              <Button onClick={handleSelectClick}>Upload File</Button>
              <Modal
                  open={uploadSelectModalVisible}
                  onOk={handleUploadSelectOkClick}
                  onCancel={handleUploadSelectCancelClick}
                  title="Upload file">
                <Form form={uploadSelectForm}>
                  <Form.Item label="File" name="file" rules={[{ required: true, message: "Please select file" }]}>
                    <Input type="file" onChange={handleSelectFileChange} />
                  </Form.Item>
                  <Form.Item>
                    <div>{selectedFile && <h3 className={"headers-position"}>FileSize: {sizeRender(fileSize)}</h3>}
                      {selectedFile &&
                        <div>
                          <div className={"info"}>
                            <div>
                              <h3 className={"headers-position"}>Яндекс.Диск</h3>
                              <h3 className={"headers-position"}>Limit: {sizeRender(yandexInfo.total_space)}</h3>
                              <h3 className={"headers-position"}>Usage: {sizeRender(yandexInfo.used_space)}</h3>
                              <h3 className={"headers-position"}>Free: {sizeRender(yandexInfo.total_space-yandexInfo.used_space)}</h3>
                              <h3 className={"headers-position"}>Will remain: {sizeRender(yandexInfo.total_space-yandexInfo.used_space-fileSize)}</h3>
                            </div>
                          <div>
                            <h3 className={"headers-position"}>Google Drive</h3>
                            <h3 className={"headers-position"}>Limit: {sizeRender(googleInfo.limit)}</h3>
                            <h3 className={"headers-position"}>Usage: {sizeRender(googleInfo.usage)}</h3>
                            <h3 className={"headers-position"}>Free: {sizeRender(googleInfo.limit-googleInfo.usage)}</h3>
                            <h3 className={"headers-position"}>Will remain: {sizeRender(googleInfo.limit-googleInfo.usage-selectedFile.size)}</h3>
                          </div>
                        </div>
                        <h3 className={"recommended"}>{recommendations}</h3>
                      </div>
                      }
                    </div>
                  </Form.Item>
                  {(selectedFile && !(!yandexEnoughSpace && !googleEnoughSpace)) &&
                      <Form.Item label={"Service"} name="radio-group" rules={[{required: true, message: "Please select service"}]}>
                        <Radio.Group onChange={handleServiceSelectChange}>
                          {yandexEnoughSpace && <Radio value={"yandex"}>Яндекс.Диск</Radio>}
                          {googleEnoughSpace && <Radio value={"google"}>Google Drive</Radio>}
                        </Radio.Group>
                      </Form.Item>
                  }
                </Form>
              </Modal>
            </>}
            <div className={"app-container"}>
              <div className={"app-child"}>
              <GoogleDrive
                  allSigned={allSigned}
                  setSign={setGoogleSigned}
                  setInfo={setGoogleInfo}
                  fileToUpload={selectedFile}
                  setFileToUpload={setSelectedFile}
                  toUpload={toGoogle}
                  setToUpload={setToGoogle}
                  fileToGet={fileToGoogle}
                  setFileToGet={setFileToGoogle}
                  setFileToSend={setFileToYandex}
                  searchQuery={searchQuery}
                  canService={yandexEnoughSpace}
              />
              </div>
              <div className={"app-child yandex-border"}>
              <YandexDisk
                  allSigned={allSigned}
                  setSign={setYandexSigned}
                  setInfo={setYandexInfo}
                  fileToUpload={selectedFile}
                  setFileToUpload={setSelectedFile}
                  toUpload={toYandex}
                  setToUpload={setToYandex}
                  fileToGet={fileToYandex}
                  setFileToGet={setFileToYandex}
                  setFileToSend={setFileToGoogle}
                  searchQuery={searchQuery}
                  canService={googleEnoughSpace}
              />
              </div>
            </div>
      </>
  )

}
