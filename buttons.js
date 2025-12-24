const buttons = document.querySelectorAll('.container2 .button');
const sections = document.querySelectorAll('.container1');

buttons.forEach((button, index) =>{
    button.addEventListener('click', () =>{
        buttons.forEach(btn => btn.classList.remove('active'));

        button.classList.add('active');

        if(index === 0){
            sections.forEach(section => {
                section.style.display - 'block';
            });
        }else{
            sections.forEach(section => {
                section.style.display = 'none';
            });

            sections[index-1].style.display = 'block';
        }
    });
});

buttons[0].classList.add('active');
sections.forEach(section => {
    section.style.display = 'block';
});