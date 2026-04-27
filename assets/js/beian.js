// assets/js/beian.js
document.addEventListener('DOMContentLoaded', function() {
  const beianHTML = `
    <div class="beian" style="width:100%;text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #dee2e6;font-size:12px;color:#6c757d;">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">京ICP备12345678号</a>
      <span style="margin:0 10px;">|</span>
      <a href="http://www.beian.gov.cn/" target="_blank" rel="noopener">
        <img src="/assets/img/beian.png" alt="公安备案" style="height:14px;vertical-align:text-bottom;">
        京公网安备 11010502030123号
      </a>
    </div>
  `;
  
  const footer = document.querySelector('footer');
  if (footer) {
    footer.insertAdjacentHTML('afterend', beianHTML);
  }
});